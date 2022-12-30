const electron = require("electron");
const { ipcRenderer } = require("electron");
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const Swal = require("sweetalert2");

function createItemTemplate(itemID, text) {
  return (
    `
  <div class="item" itemID="` +
    itemID +
    `">
    <div class="text">
    ` +
    text +
    `
    </div>
    <button class="clipboard" itemID="` +
    itemID +
    `">
      <span class="icon icon-clipboard"></span>
    </button>
    <button class="delete" itemID="` +
    itemID +
    `">
      <span class="icon icon-delete"></span>
    </button>
  </div>
`
  );
}

ipcRenderer.on("update-clipboard", async event => {
  let text = await getLastItemDb();
  console.log('last item', text);

  await writeLastItem(text[0]);
});

function getLastItemDb() {
  const adapter = new FileSync(
    path.join('/Users/ahmetk', "/.clipaste.json")
  );

  const db = low(adapter);
  return db
    .get("clipboard")
    .takeRight(1)
    .value();
}

document.addEventListener("DOMContentLoaded", function() {
  const adapter = new FileSync(
      path.join('/Users/ahmetk', "/.clipaste.json")
  );
  const db = low(adapter);
  const items = db.get("clipboard").value();

  items.reverse();
  writeItems(items);
});

document.querySelector('.minimize').addEventListener('click', () => {
  ipcRenderer.send("hide-window");
});

document.querySelector('.exit').addEventListener('click', () => {
  Swal.fire({
    title: "Are you sure?",
    text: "Application is closing. Are you sure you want to continue?",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#aaa",
    confirmButtonText: "Yes, Exit!",
    cancelButtonText: "Cancel"
  }).then(result => {
    if (result.value) {
      ipcRenderer.send("app-quit");
    }
  });
});

// $(".delete-all").click(function() {
//   Swal.fire({
//     title: "Are you sure?",
//     text: "You won't be able to revert this!",
//     showCancelButton: true,
//     confirmButtonColor: "#d33",
//     cancelButtonColor: "#aaa",
//     confirmButtonText: "Delete Clipboard",
//     cancelButtonText: "Cancel"
//   }).then(result => {
//     if (result.value) {
//       const adapter = new FileSync(
//         path.join('/Users/ahmetk', "/.clipaste.json")
//       );
//       const db = low(adapter);
//       db.get("clipboard")
//         .remove()
//         .write();
//       clearDashboard();
//     }
//   });
// });

// $("#items").on("click", ".item button.delete", function() {
//   const itemID = $(this).attr("itemid");
//   deleteItemClipboard(itemID);
// });
//
// $("#items").on("click", ".item button.clipboard", function() {
//   const itemID = $(this).attr("itemid");
//   let text = $("#items div.item[itemid='" + itemID + "'] div.text").text();
//   clipboard.writeText(text);
// });

function deleteItemClipboard(itemID) {
  const adapter = new FileSync(
    path.join('/Users/ahmetk', "/.clipaste.json")
  );
  const db = low(adapter);
  db.get("clipboard")
    .remove({ id: itemID })
    .write();

  document.querySelector(`div[itemid=${itemID}]`).remove();
}

function writeItems(items) {
  items.forEach(element => {
    document.querySelector('#items').innerHTML = document.querySelector('#items').innerHTML + createItemTemplate(element.id, element.text);
  });
}

function writeLastItem(item) {
  document.querySelector('#items').innerHTML = createItemTemplate(item.id, item.text) + document.querySelector('#items').innerHTML;
}

function clearDashboard() {
  document.querySelector('#items').innerHTML = '';
}
