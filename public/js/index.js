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

$(document).ready(function() {
    $('#submissionsTable').DataTable({
        "columnDefs": [
            {
                "targets": 1,
                "render": function(data) {
                    var date = new Date(data);
                    return date.getTime();
                }
            }
        ]
    });
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
        document.getElementById('user').innerHTML = `Signed in as ${user.displayName}`;

        // Show logout button
        document.getElementById('logout').style.display = 'block';
        document.getElementById('googleSignIn').style.display = 'none';

        // show clock in button
        document.getElementById('clockIn').style.display = 'block';

        // Get admins document from users collection
        const adminsRef = doc(db, 'users', 'admins');
        try {
            const docSnap = await getDoc(adminsRef);

            if (docSnap.exists()) {
                // Check if user is admin
                if (docSnap.data().emails.includes(user.email)) {
                    auth.currentUser.isAdmin = true;
                    getAllSubmissions();
                } else {
                    auth.currentUser.isAdmin = false;
                    getUserSumbissions(user);
                }
            } else {
                console.log("No such document!");
            }
        } catch (error) {
            console.log("Error getting document:", error);
        }
    } else {
        document.getElementById('user').innerHTML = '';

        // hide clock in button
        document.getElementById('clockIn').style.display = 'none';

        // Show login button
        document.getElementById('googleSignIn').style.display = 'block';
        document.getElementById('logout').style.display = 'none';
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
        getUserSubmissions(user);
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
            document.getElementById('submissionsBody').innerHTML = '';
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
                placeLink.textContent = `${place.latitude}, ${place.longitude}`;
                placeData.appendChild(placeLink);
                // append the table data to the table row
                row.appendChild(timeData);
                row.appendChild(placeData);
                // append the table row to the submissions table body
                document.getElementById('submissionsBody').appendChild(row);
            });
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
            document.getElementById('submissionsBody').innerHTML = 'No submissions found';
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
    document.getElementById('submissionsBody').innerHTML = '';

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
        placeLink.textContent = `${place.latitude}, ${place.longitude}`;
        placeData.appendChild(placeLink);
        // append the table data to the table row
        row.appendChild(nameData);
        row.appendChild(timeData);
        row.appendChild(placeData);
        // append the table row to the submissions table body
        document.getElementById('submissionsBody').appendChild(row);
    });
}