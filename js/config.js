const REPO = "rachelshin-works/26summer_cdp_computational";
const BRANCH = "main";

function assetUrl(path) {
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isLocal) return path;
  return `https://media.githubusercontent.com/media/${REPO}/${BRANCH}/${path}`;
}

export const BENCH_MODELS = [
  assetUrl("assets/iS9XFEEXfDZmXR77jrXT-.glb"),
  assetUrl("assets/TR16miUSzq2L9oNuVKUMq.glb"),
  assetUrl("assets/ifdbWyUKwlzNqxSWeo9vY.glb"),
];
