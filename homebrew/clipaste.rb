# The Release workflow sets version and sha256 for each new tag and pushes
# this file to https://github.com/ahmetkorkmaz3/homebrew-tap.

cask "clipaste" do
  version "2.0.0"
  sha256 "392cc26c1b3dbcb078b0def322d8e05e0259a40baaf8b7654bf9f124801339ab"

  url "https://github.com/ahmetkorkmaz3/clipaste/releases/download/v#{version}/clipaste-#{version}-mac-universal.dmg"
  name "Clipaste"
  desc "Clipboard manager that shows the app each item came from"
  homepage "https://ahmetkorkmaz3.github.io/clipaste/"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: :ventura

  app "Clipaste.app"

  # Clipaste has only an ad hoc signature, so Gatekeeper blocks the first
  # start while the download quarantine flag is set. Remove the flag.
  postflight_steps do
    run "/usr/bin/xattr",
        args:           ["-dr", "com.apple.quarantine", "{{appdir}}/Clipaste.app"],
        writable_paths: ["{{appdir}}/Clipaste.app"]
  end

  uninstall quit: "com.arkkod.clipaste"

  zap trash: [
    "~/.clipaste.json",
    "~/Library/Application Support/Clipaste",
    "~/Library/Logs/Clipaste",
    "~/Library/Preferences/com.arkkod.clipaste.plist",
    "~/Library/Saved Application State/com.arkkod.clipaste.savedState",
  ]
end
