import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <main className="container">
      <h1>About</h1>
      <p>This app is powered by Tauri, React and TanStack Router.</p>
    </main>
  );
}
