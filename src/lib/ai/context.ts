export type DiffSection = { path: string; text: string };
export function diffSections(text: string): DiffSection[] {
  return [...text.matchAll(/^diff --git .+$/gm)].map((match, i, matches) => {
    const start = match.index!;
    return { path: match[0].replace(/^diff --git .* b\//, ''), text: text.slice(start, matches[i + 1]?.index ?? text.length) };
  });
}

/** Reserve space for every filename, then share the remaining budget across files. */
export function budgetContext(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const files = diffSections(trimmed);
  if (maxChars < 64) return trimmed.slice(0, Math.max(0, maxChars));
  if (files.length === 0) {
    const note = '\n[Context shortened]';
    return trimmed.slice(0, Math.max(0, maxChars - note.length)) + note.slice(0, maxChars);
  }
  const summary = '[Diff shortened; excerpts follow. Files: ' + files.map(f => f.path).join(', ') + ']\n';
  if (summary.length >= maxChars) return summary.slice(0, Math.max(0, maxChars - 22)) + '\n[File list shortened]';
  let remaining = maxChars - summary.length;
  const parts = files.map((file, i) => {
    const allowance = Math.floor(remaining / (files.length - i));
    const marker = '\n[File excerpt shortened]\n';
    const part = file.text.length <= allowance ? file.text : file.text.slice(0, Math.max(0, allowance - marker.length)) + marker.slice(0, allowance);
    remaining -= part.length;
    return part;
  });
  return summary + parts.join('');
}

/** Remove a file's patch while preserving surrounding prompt instructions. */
export function excludeDiffFile(text: string, path: string): string {
  let excluded = false;
  let binaryPayload = false;
  const kept: string[] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      binaryPayload = false;
      excluded = line.replace(/^diff --git .* b\//, '') === path;
      if (excluded) continue;
    } else if (excluded) {
      if (binaryPayload) { if (!line) binaryPayload = false; continue; }
      if (/^(literal|delta) \d+$/.test(line)) { binaryPayload = true; continue; }
      if (/^(?:[ +\-@\\]|index |(?:old|new|deleted file|new file) mode |(?:dis)?similarity index |(?:rename|copy) (?:from|to) |Binary files |GIT binary patch|literal \d|delta \d|\[File excerpt shortened\])/.test(line) || !line) continue;
      excluded = false;
    }
    kept.push(line);
  }
  // Budget summaries list every input file; remove the excluded name there too.
  return kept.join('\n').replace(/^(\[Diff shortened; excerpts follow\. Files: )(.+)(\])$/gm,
    (_, prefix, names: string, suffix) => prefix + names.split(', ').filter(name => name !== path).join(', ') + suffix);
}
