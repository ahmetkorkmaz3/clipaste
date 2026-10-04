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

  uninstall quit: "com.arkkod.clipaste"

  zap trash: [
    "~/.clipaste.json",
    "~/Library/Application Support/Clipaste",
    "~/Library/Logs/Clipaste",
    "~/Library/Preferences/com.arkkod.clipaste.plist",
    "~/Library/Saved Application State/com.arkkod.clipaste.savedState",
  ]

  caveats <<~EOS
    Clipaste is not signed. If macOS blocks the first start, open
    System Settings > Privacy & Security and select "Open Anyway".
  EOS
end
