const electron = require("electron");
const { ipcRenderer, clipboard } = require("electron");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

function createItemTemplate(itemID, text) {
  return (
    `
  <div class="item" data-item-id="` +
    itemID +
    `">
    <div class="text">
    ` +
    text +
    `
    </div>
    <button class="clipboard" data-item-id="` +
    itemID +
    `">
      <span class="icon icon-clipboard"></span>
    </button>
    <button class="delete" data-item-id="` +
    itemID +
    `">
      <span class="icon icon-delete"></span>
    </button>
  </div>`
  );
}

ipcRenderer.on("update-clipboard", async () => {
  let text = await getLastItemDb();

  console.log('text', text);

  await writeLastItem(text[0]);
});

function getLastItemDb() {
  const adapter = new FileSync(
    path.join(electron.remote.app.getPath("home"), "/.clipaste.json")
  );
  const db = low(adapter);
  return db
      .get("clipboard")
      .last()
      .value();
}

(function() {
  const adapter = new FileSync(
    path.join(electron.remote.app.getPath("home"), "/.clipaste.json")
  );
  const db = low(adapter);
  const items = db.get("clipboard").value();

  items.reverse();
  writeItems(items);
})();

const minimizeElement = document.querySelector('.minimize');

minimizeElement.addEventListener('click', () => {
  ipcRenderer.send("hide-window");
});

const exitButton = document.querySelector('.exit');

exitButton.addEventListener('click', () => {
  ipcRenderer.send('app-quit');
});

const deleteAllButton = document.querySelector('.delete-all');
deleteAllButton.addEventListener('click', () => {
  const adapter = new FileSync(
    path.join(electron.remote.app.getPath("home"), "/.clipaste.json")
  );
  const db = low(adapter);
  db.get("clipboard")
    .remove()
    .write();
  clearDashboard();
});

const itemDeleteButtons = document.querySelectorAll('#items .item button.delete');
itemDeleteButtons.forEach(element => {
  element.addEventListener('click', () => {
    const itemId = element.getAttribute('data-item-id');
    deleteItemClipboard(itemId);
  });
});

const itemCopyToClipboardButtons = document.querySelectorAll('#items .item button.clipboard');
itemCopyToClipboardButtons.forEach(element => {
  element.addEventListener('click', () => {
    const text = element.text;
    clipboard.writeText(text);
  });
});

function deleteItemClipboard(itemID) {
  const adapter = new FileSync(
    path.join(electron.remote.app.getPath("home"), "/.clipaste.json")
  );
  const db = low(adapter);
  db.get("clipboard")
    .remove({ id: itemID })
    .write();

  document.querySelector(`div[data-item-id="${itemID}"]`)?.remove();
}

function writeItems(items) {
  items.forEach(element => {
    document.querySelector('#items').append(createItemTemplate(element.id, element.text));
  });
}

function writeLastItem(item) {
  document.querySelector('#items').prepend(createItemTemplate(item.id, item.text));
}

function clearDashboard() {
  document.querySelector('#items')?.remove();
}
