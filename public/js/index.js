import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  GeoPoint,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxcHxbdV9-mnjieZrqQMUqQZKLMl034N4",
  authDomain: "mass-clock-in.firebaseapp.com",
  projectId: "mass-clock-in",
  storageBucket: "mass-clock-in.appspot.com",
  messagingSenderId: "618955403785",
  appId: "1:618955403785:web:856eeced9aaf17f8ebbed8",
  measurementId: "G-K43TBWDDDD",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
let submissions = [];
let markers = [];

document.addEventListener("DOMContentLoaded", () => {
  applyUser(auth.currentUser);
});

auth.onAuthStateChanged((user) => {
  applyUser(user);
});

document.getElementById("googleSignIn").addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((error) => {
    showError(error.message);
  });
});

document.getElementById("logout").addEventListener("click", () => {
  auth.signOut().catch((error) => {
    showError(error);
  });
});

async function applyUser(user) {
  // close collapsable menu
  document.getElementById("navbarNav").classList.remove("show");

  if (user) {
    const docRef = doc(db, "submissions", user.uid);
    // set user email and name in firestore
    await setDoc(
      docRef,
      {
        email: user.email,
        name: user.displayName,
      },
      { merge: true }
    );

    // default user to not admin
    auth.currentUser.isAdmin = false;

    // Get admins document from users collection
    const adminsRef = doc(db, "users", "admins");
    try {
      const docSnap = await getDoc(adminsRef);

      if (docSnap.exists()) {
        // Check if user is admin
        if (docSnap.data().emails.includes(user.email)) {
          auth.currentUser.isAdmin = true;
        }
      }
    } catch (error) {
      console.log("Error getting document:", error);
    }

    document.getElementById("allSubmissionsTable").hidden =
      !auth.currentUser.isAdmin;
    document.getElementById("userSubmissionsTable").hidden =
      auth.currentUser.isAdmin;

    if (auth.currentUser.isAdmin) {
      getAllSubmissions().then(() => {
        checkIfClockedIn();
      });
    } else {
      getUserSubmissions(user).then(() => {
        checkIfClockedIn();
      });
    }

    document.getElementById(
      "user"
    ).innerHTML = `Signed in as ${user.displayName}<br><a href="https://www.gmail.com" target="_blank">${user.email}</a>`;

    document.getElementById("response").hidden = true;

    setUserContentVisibility(true);
  } else {
    // user is signed out
    document.getElementById("user").innerHTML = "";

    clearDataTable("#userSubmissionsTable");
    clearDataTable("#allSubmissionsTable");

    setUserContentVisibility(false);
  }
}

function setUserContentVisibility(isSignedIn) {
  Array.from(document.getElementsByClassName("signedInUserContent")).forEach(
    function (element) {
      element.hidden = !isSignedIn;
    }
  );

  Array.from(document.getElementsByClassName("signedOutUserContent")).forEach(
    function (element) {
      element.hidden = isSignedIn;
    }
  );
}

document.getElementById("clockIn").addEventListener("click", () => {
  document.getElementById("clockIn").disabled = true;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(clockIn, showError);
  } else {
    showError("Geolocation is not supported by this browser.");
    document.getElementById("clockIn").disabled = false;
  }
});

function checkIfClockedIn() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const userSubmissionsToday = submissions.filter((submission) => {
    const submissionDate = new Date(submission.time);
    submissionDate.setHours(0, 0, 0, 0);
    if (auth.currentUser.isAdmin) {
      return (
        submission.email === auth.currentUser.email &&
        submissionDate.getTime() === today.getTime()
      );
    } else {
      return submissionDate.getTime() === today.getTime();
    }
  });

  if (userSubmissionsToday.length > 0) {
    showClockedIn();
  }
}

async function clockIn(position) {
  // submit to firestore
  const timestamp = Date.now();
  const geopoint = new GeoPoint(
    position.coords.latitude,
    position.coords.longitude
  );
  const docRef = doc(db, "submissions", auth.currentUser.uid);

  const newSubmission = {
    time: timestamp,
    place: geopoint,
  };

  await setDoc(
    docRef,
    {
      submissions: arrayUnion(newSubmission),
    },
    { merge: true }
  ).catch((error) => {
    console.error("Error updating document: ", error);
  });

  showSuccess("Clock in successful!");

  if (auth.currentUser.isAdmin) {
    getAllSubmissions();
  } else {
    getUserSubmissions(auth.currentUser);
  }

  showClockedIn();
}

const response = document.getElementById("response");

function showSuccess(message) {
  clearResponse();
  const textNode = document.createTextNode(message);
  response.appendChild(textNode);
  response.classList.remove("alert-danger");
  response.classList.add("alert-success");
  response.hidden = false;
}

function showError(error) {
  clearResponse();
  let errorMessage;
  switch (error.code) {
    case error.PERMISSION_DENIED:
      errorMessage = "User denied the request for Geolocation.";
      break;
    case error.POSITION_UNAVAILABLE:
      errorMessage = "Location information is unavailable.";
      break;
    case error.TIMEOUT:
      errorMessage = "The request to get user location timed out.";
      break;
    case error.UNKNOWN_ERROR:
      errorMessage = "An unknown error occurred.";
      break;
    default:
      errorMessage = error;
  }
  const textNode = document.createTextNode(errorMessage);
  response.appendChild(textNode);
  response.classList.remove("alert-success");
  response.classList.add("alert-danger");
  response.hidden = false;

  document.getElementById("clockIn").disabled = false;
}

function clearResponse() {
  while (response.lastChild && response.lastChild.nodeType === 3) {
    response.removeChild(response.lastChild);
  }
}

async function getUserSubmissions(user) {
  const docRef = doc(db, "submissions", user.uid);
  const submissionDoc = await getDoc(docRef);
  if (submissionDoc.exists()) {
    submissions = submissionDoc.data().submissions;
    clearDataTable("#userSubmissionsTable");
    clearDataTable("#allSubmissionsTable");
    submissions.forEach((submission) => {
      addMarker(submission);
      addSubmissionRow(submission);
    });
    initDataTable("#userSubmissionsTable", 0);
  } else {
    document.getElementById("userSubmissionsBody").innerHTML =
      "No submissions found";
  }
}

async function getAllSubmissions() {
  submissions = [];
  const submissionsRef = collection(db, "submissions");
  const querySnapshot = await getDocs(submissionsRef);
  querySnapshot.docs.forEach((doc) => {
    const userName = doc.data().name;
    const email = doc.data().email;
    let userSubmissions = doc.data().submissions;
    if (!userSubmissions) return;
    userSubmissions.forEach((submission) => {
      submission.userName = userName;
      submission.email = email;
      submissions.push(submission);
    });
  });

  clearDataTable("#allSubmissionsTable");
  clearDataTable("#userSubmissionsTable");

  submissions.forEach((submission) => {
    addMarker(submission);
    addSubmissionRow(submission);
  });

  initDataTable("#allSubmissionsTable");
}

function addSubmissionRow(submission) {
  let row = document.createElement("tr");
  let tableBodyId = "userSubmissionsBody";

  if (submission.userName) {
    tableBodyId = "allSubmissionsBody";
    let nameData = document.createElement("td");
    nameData.textContent = submission.userName;
    row.appendChild(nameData);
  }

  const time = new Date(submission.time).toLocaleString();
  let timeData = document.createElement("td");
  timeData.textContent = time;
  row.appendChild(timeData);

  const place = submission.place;
  let placeData = document.createElement("td");
  let placeLink = document.createElement("a");
  placeLink.href = `#map`;
  placeLink.addEventListener("click", () => {
    onPlaceLinkClick(submissions.indexOf(submission));
  });
  placeLink.textContent = `${place.latitude.toFixed(
    2
  )}, ${place.longitude.toFixed(2)}`;
  placeData.appendChild(placeLink);
  row.appendChild(placeData);

  document.getElementById(tableBodyId).appendChild(row);
}

function addMarker(submission) {
  const time = new Date(submission.time).toLocaleString();
  const title = submission.userName ? submission.userName + `\n` + time : time;
  var marker = new google.maps.Marker({
    position: {
      lat: submission.place.latitude,
      lng: submission.place.longitude,
    },
    map: map,
    title: title,
  });

  const infowindow = new google.maps.InfoWindow({
    content: marker.title,
  });

  marker.addListener("click", function () {
    infowindow.open(map, marker);
  });

  markers.push({ marker, infowindow });
}

var datePicker;

function clearDataTable(tableId) {
  if ($.fn.DataTable.isDataTable(tableId)) {
    $(tableId).DataTable().destroy();
  }
  $(tableId + " tbody").empty();
}

function initDataTable(tableId, dateColumnIndex = 1) {
  $(tableId).DataTable({
    createdRow: function (row, data) {
      var date = new Date(data[dateColumnIndex]);
      $("td", row).eq(dateColumnIndex).html(date.toLocaleString());
    },
    columnDefs: [
      {
        targets: dateColumnIndex,
        type: "date",
      },
    ],
    order: [[dateColumnIndex, "desc"]],
  });

  const dateInput = document.createElement("input");
  dateInput.id = "dateSearch";
  dateInput.type = "search";
  dateInput.placeholder = "Search by date";
  dateInput.addEventListener("input", () => {
    const table = $(tableId).DataTable();
    table.column(dateColumnIndex).search(dateInput.value).draw();
  });

  document.querySelector(`${tableId}_filter`).appendChild(dateInput);

  const datePickerButton = document.createElement("i");
  datePickerButton.id = "datePickerButton";
  datePickerButton.classList.add("fas", "fa-calendar-alt");
  datePickerButton.addEventListener("click", () => {
    if (datePicker) datePicker.open();
  });
  dateInput.after(datePickerButton);

  datePicker = flatpickr("#dateSearch", {
    enableTime: false,
    dateFormat: "n/j/Y",
  });
}

function showClockedIn() {
  document.getElementById("clockIn").hidden = true;
  const msg = document.getElementById("clockedInMessage");
  msg.innerHTML = `You have clocked in today.`;
  msg.classList.add("pt-3");
}

function onPlaceLinkClick(index) {
  const { marker, infowindow } = markers[index];
  map.panTo(marker.getPosition());
  infowindow.open(map, marker);
}
