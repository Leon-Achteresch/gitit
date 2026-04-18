export type RemoteRepo = {
  name: string;
  full_name: string;
  clone_url: string;
  description: string | null;
  private: boolean;
  default_branch: string | null;
};
