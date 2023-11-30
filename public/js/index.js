import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyBxcHxbdV9-mnjieZrqQMUqQZKLMl034N4",
    authDomain: "mass-clock-in.firebaseapp.com",
    projectId: "mass-clock-in",
    storageBucket: "mass-clock-in.appspot.com",
    messagingSenderId: "618955403785",
    appId: "1:618955403785:web:856eeced9aaf17f8ebbed8",
    measurementId: "G-K43TBWDDDD"
};

const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);
const provider = new GoogleAuthProvider();

//on document ready
document.addEventListener('DOMContentLoaded', () => {
    applyUser(firebase.auth().currentUser);
});

firebase.auth().onAuthStateChanged((user) => {
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

function applyUser(user) {
    if (user) {
        // User is signed in
        var uid = user.uid;
        // check if user is admin
        // get admins document from users collection
        const db = firebase.firestore();
        const adminsRef = db.collection('users').doc('admins');
        adminsRef.get().then((doc) => {
            if (doc.exists) {
                // check if user is admin
                if (doc.data().emails.includes(user.email)) {
                    // show admin div
                    document.getElementById('admin').style.display = 'block';
                    document.getElementById('user').style.display = 'none';
                } else {
                    // show user div
                    document.getElementById('user').style.display = 'block';
                    document.getElementById('admin').style.display = 'none';
                }
            } else {
                // doc.data() will be undefined in this case
                console.log("No such document!");
            }
        }).catch((error) => {
            console.log("Error getting document:", error);
        });
    } else {
        // hide user and admin divs
        document.getElementById('user').style.display = 'none';
        document.getElementById('admin').style.display = 'none';
    }
}

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else { 
        document.getElementById("location").innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showPosition(position) {
    document.getElementById("location").innerHTML = "Latitude: " + position.coords.latitude + 
    "<br>Longitude: " + position.coords.longitude;
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            document.getElementById("location").innerHTML = "User denied the request for Geolocation."
            break;
        case error.POSITION_UNAVAILABLE:
            document.getElementById("location").innerHTML = "Location information is unavailable."
            break;
        case error.TIMEOUT:
            document.getElementById("location").innerHTML = "The request to get user location timed out."
            break;
        case error.UNKNOWN_ERROR:
            document.getElementById("location").innerHTML = "An unknown error occurred."
            break;
    }
}
