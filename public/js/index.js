import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, GeoPoint, arrayUnion } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBxcHxbdV9-mnjieZrqQMUqQZKLMl034N4",
    authDomain: "mass-clock-in.firebaseapp.com",
    projectId: "mass-clock-in",
    storageBucket: "mass-clock-in.appspot.com",
    messagingSenderId: "618955403785",
    appId: "1:618955403785:web:856eeced9aaf17f8ebbed8",
    measurementId: "G-K43TBWDDDD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    applyUser(auth.currentUser);
});

auth.onAuthStateChanged((user) => {
    applyUser(user);
});

document.getElementById('googleSignIn').addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            // if (user.email.includes('masscincy')) {
            //     console.log('Signed in successfully!');
            // } else {
            //     console.log('Unauthorized email');
            // }
        }).catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorMessage);
        });
});

document.getElementById('logout').addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('Signed out successfully!');
    }).catch((error) => {
        console.log(error);
    });
});

async function applyUser(user) {
    // close collapsable menu
    document.getElementById('navbarNav').classList.remove('show');

    if (user) {
        const docRef = doc(db, 'submissions', user.uid);
        // set user email and name in firestore
        await setDoc(docRef, {
            email: user.email,
            name: user.displayName
        }, { merge: true }).then(() => {
            console.log('Document successfully updated!');
        }).catch((error) => {
            console.error('Error updating document: ', error);
        });
        
        // Show user info
        document.getElementById('user').innerHTML = `Signed in as ${user.displayName}<br><a href="https://www.gmail.com" target="_blank">${user.email}</a>`;

        // Show logout button
        document.getElementById('logout').hidden = false;
        document.getElementById('googleSignIn').hidden = true;

        // show clock in button
        document.getElementById('clockIn').hidden = false;

        // Get admins document from users collection
        const adminsRef = doc(db, 'users', 'admins');
        try {
            const docSnap = await getDoc(adminsRef);

            if (docSnap.exists()) {
                // Check if user is admin
                if (docSnap.data().emails.includes(user.email)) {
                    document.getElementById('allSubmissionsTable').hidden = false;
                    document.getElementById('userSubmissionsTable').hidden = true;
                    auth.currentUser.isAdmin = true;
                    getAllSubmissions();
                } else {
                    document.getElementById('allSubmissionsTable').hidden = true;
                    document.getElementById('userSubmissionsTable').hidden = false;
                    auth.currentUser.isAdmin = false;
                    getUserSubmissions(user);
                }
                document.getElementById('submissionsTableContainer').hidden = false;
            } else {
                console.log("No such document!");
            }
        } catch (error) {
            console.log("Error getting document:", error);
        }
    } else {
        document.getElementById('user').innerHTML = '';

        // hide clock in button
        document.getElementById('clockIn').hidden = true;

        // hide submissions tables
        document.getElementById('submissionsTableContainer').hidden = true;

        // clear the submissions table body
        document.getElementById('allSubmissionsBody').innerHTML = '';

        // Show login button
        document.getElementById('googleSignIn').hidden = false;
        document.getElementById('logout').hidden = true;
    }
}

document.getElementById('clockIn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(clockIn, showError);
    } else { 
        document.getElementById("response").innerHTML = "Geolocation is not supported by this browser.";
    }
});

async function clockIn(position) {
    // submit to firestore
    const timestamp = Date.now();
    const geopoint = new GeoPoint(position.coords.latitude, position.coords.longitude);
    const docRef = doc(db, 'submissions', auth.currentUser.uid);

    const newSubmission = {
        time: timestamp,
        place: geopoint
    };

    await setDoc(docRef, {
        submissions: arrayUnion(newSubmission)
    }, { merge: true }).then(() => {
        console.log('Document successfully updated!');
    }).catch((error) => {
        console.error('Error updating document: ', error);
    });

    // show success message
    document.getElementById("response").innerHTML = "Clock in successful!";
    // refresh clock ins
    if(auth.currentUser.isAdmin){
        getAllSubmissions();
    }else{
        getUserSubmissions(auth.currentUser);
    }
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            document.getElementById("response").innerHTML = "User denied the request for Geolocation."
            break;
        case error.POSITION_UNAVAILABLE:
            document.getElementById("response").innerHTML = "Location information is unavailable."
            break;
        case error.TIMEOUT:
            document.getElementById("response").innerHTML = "The request to get user location timed out."
            break;
        case error.UNKNOWN_ERROR:
            document.getElementById("response").innerHTML = "An unknown error occurred."
            break;
    }
}

function getUserSubmissions(user){
    const docRef = doc(db, 'submissions', user.uid);
    getDoc(docRef).then((doc) => {
        if (doc.exists()) {
            let userSubmissions = doc.data().submissions;
            userSubmissions.sort((a, b) => b.time - a.time);
            // clear the submissions table body
            document.getElementById('userSubmissionsBody').innerHTML = '';
            userSubmissions.forEach((submission) => {
                const time = new Date(submission.time).toLocaleString();
                const place = submission.place;
                const link = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
                // create a table row
                let row = document.createElement('tr');
                // create table data for the time and place
                let timeData = document.createElement('td');
                timeData.textContent = time;
                let placeData = document.createElement('td');
                let placeLink = document.createElement('a');
                placeLink.href = link;
                placeLink.target = '_blank';
                placeLink.textContent = `${place.latitude}, ${place.longitude}`;
                placeData.appendChild(placeLink);
                // append the table data to the table row
                row.appendChild(timeData);
                row.appendChild(placeData);
                // append the table row to the submissions table body
                document.getElementById('userSubmissionsBody').appendChild(row);
            });
            initDataTable('#userSubmissionsTable', 0);
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
            document.getElementById('userSubmissionsBody').innerHTML = 'No submissions found';
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });
}

async function getAllSubmissions(){
    // create an array to hold all submissions
    let allSubmissions = [];

    // get every document from the submissions collection
    const submissionsRef = collection(db, 'submissions');
    const querySnapshot = await getDocs(submissionsRef);
    querySnapshot.docs.forEach((doc) => {
        const userName = doc.data().name;
        let userSubmissions = doc.data().submissions;
        userSubmissions.forEach((submission) => {
            // add the user's name to each submission
            submission.userName = userName;
            // add the submission to the all submissions array
            allSubmissions.push(submission);
        });
    });

    // sort all submissions by time
    allSubmissions.sort((a, b) => b.time - a.time);

    // clear the submissions table body
    document.getElementById('allSubmissionsBody').innerHTML = '';

    // display all submissions
    allSubmissions.forEach((submission) => {
        const time = new Date(submission.time).toLocaleString();
        const place = submission.place;
        const link = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
        // create a table row
        let row = document.createElement('tr');
        // create table data for the user's name, time, and place
        let nameData = document.createElement('td');
        nameData.textContent = submission.userName;
        let timeData = document.createElement('td');
        timeData.textContent = time;
        let placeData = document.createElement('td');
        let placeLink = document.createElement('a');
        placeLink.href = link;
        placeLink.target = '_blank';
        placeLink.textContent = `${place.latitude}, ${place.longitude}`;
        placeData.appendChild(placeLink);
        // append the table data to the table row
        row.appendChild(nameData);
        row.appendChild(timeData);
        row.appendChild(placeData);
        // append the table row to the submissions table body
        document.getElementById('allSubmissionsBody').appendChild(row);
    });
    initDataTable('#allSubmissionsTable');
}

function initDataTable(tableId, dateColumnIndex = 1){
    // Check if DataTable is already initialized
    if ($.fn.DataTable.isDataTable(tableId)) {
        $(tableId).DataTable().destroy();
    }

    $(tableId).DataTable({
        "createdRow": function(row, data) {
            var date = new Date(data[dateColumnIndex]);
            $('td', row).eq(dateColumnIndex).html(date.toLocaleString());
        },
        "columnDefs": [
            {
                "targets": dateColumnIndex,
                "type": "date"
            }
        ],
        "order": [[ dateColumnIndex, "desc" ]],
    });
}

function initMap() {
    var options = {
        zoom: 8,
        center: {lat: 40.7128, lng: -74.0060} // Coordinates for New York City
    }
    var map = new google.maps.Map(document.getElementById('map'), options);
}

document.getElementById('datePicker').addEventListener('change', function() {
    var parts = this.value.split('-');
    var selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const inputs = Array.from(document.getElementsByTagName('input'));
    let searchInput = inputs.find(input => input.type === 'search');
    if (searchInput) {
        searchInput.value = selectedDate.toLocaleDateString();
        searchInput.dispatchEvent(new Event('input'));
    }
});