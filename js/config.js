const REPO = "rachelshin-works/26summer_cdp_computational";
const BRANCH = "main";

function assetUrl(path) {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const isGitHubPages = host.endsWith("github.io");

  if (isLocal) return path;
  if (isGitHubPages) {
    return `https://media.githubusercontent.com/media/${REPO}/${BRANCH}/${path}`;
  }
  return path;
}

export const BENCH_MODELS = [
  assetUrl("assets/iS9XFEEXfDZmXR77jrXT-.glb"),
  assetUrl("assets/TR16miUSzq2L9oNuVKUMq.glb"),
  assetUrl("assets/ifdbWyUKwlzNqxSWeo9vY.glb"),
];
