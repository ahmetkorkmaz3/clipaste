const electron = require("electron");
const { ipcRenderer } = require("electron");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const $ = require("jquery");

function createItemTemplate(itemID, text) {
  return `
  <div class="item">
    <div class="text" itemID="` + itemID + `">
    ` + text + `
    </div>
    <button class="clipboard" itemID="` + itemID + `">
      <img src="./images/icons/clipboard.svg" >
    </button>
    <button class="delete" itemID="` + itemID + `">
      <img src="./images/icons/trash-2.svg" >
    </button>
  </div>
  `;
}

ipcRenderer.on("update-clipboard", async event => {
  let text = await getLastItemDb();
  console.log(text);
  await writeLastItem(text[0]);
});

function getLastItemDb() {
  const adapter = new FileSync(
    path.join(electron.remote.app.getPath("home"), "/.clipaste.json")
  );
  const db = low(adapter);
  return (text = db
    .get("clipboard")
    .takeRight(1)
    .value());
}

$(function() {
  const adapter = new FileSync(
    path.join(electron.remote.app.getPath("home"), "/.clipaste.json")
  );
  const db = low(adapter);
  const items = db.get("clipboard").value();

  items.reverse();
  writeItems(items);
});

function writeItems(items) {
  items.forEach(element => {
    $("#items").append(createItemTemplate(element.id, element.text));
  });
}

function writeLastItem(item) {
  $("#items").prepend(createItemTemplate(item.id, item.text));
}
