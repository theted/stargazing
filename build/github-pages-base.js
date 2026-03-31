const normalizeRepositoryName = (value) => String(value || "").trim().toLowerCase();

export const resolveGitHubPagesBase = ({
  repository = "",
  isGitHubActions = false,
} = {}) => {
  if (!isGitHubActions) {
    return "/";
  }

  const [owner = "", repo = ""] = String(repository).split("/");
  const normalizedOwner = normalizeRepositoryName(owner);
  const normalizedRepo = normalizeRepositoryName(repo);

  if (!normalizedRepo) {
    return "/";
  }

  if (normalizedRepo === `${normalizedOwner}.github.io`) {
    return "/";
  }

  return `/${normalizedRepo}/`;
};
