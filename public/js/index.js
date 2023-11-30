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
                    getAllSubmissions();
                } else {
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
    const user = auth.currentUser;
    const timestamp = Date.now();
    const geopoint = new GeoPoint(position.coords.latitude, position.coords.longitude);
    const docRef = doc(db, 'submissions', user.uid);

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
    getUserSubmissions(user);
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
            userSubmissions.sort((a, b) => a.time - b.time);
            userSubmissions.forEach((submission) => {
                const time = submission.time;
                const date = new Date(time);
                const place = submission.place;
                // put place in a link to google maps
                const link = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
                console.log(`Time: ${date}, Place: ${place.latitude}, ${place.longitude}`);
                // output to submissions paragraph
                document.getElementById('submissions').innerHTML += `Time: ${date}, Place: <a href="${link}" target="_blank">${place.latitude}, ${place.longitude}</a>`;
                // add a line break
                document.getElementById('submissions').innerHTML += '<br>';
            });
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
            document.getElementById('submissions').innerHTML = 'No submissions found';
        }
    }).catch((error) => {
        console.log("Error getting document:", error);
    });
}

async function getAllSubmissions(){
    // get every document from the submissions collection
    const submissionsRef = collection(db, 'submissions');
    const querySnapshot = await getDocs(submissionsRef);
    querySnapshot.docs.forEach(async (doc) => {
        const userName = doc.data().name;
        let userSubmissions = doc.data().submissions;
        userSubmissions.sort((a, b) => a.time - b.time);
        userSubmissions.forEach((submission) => {
            const time = submission.time;
            const date = new Date(time);
            const place = submission.place;
            const link = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
            console.log(`User: ${userName}, Time: ${date}, Place: ${place.latitude}, ${place.longitude}`);
            // output to submissions paragraph
            document.getElementById('submissions').innerHTML += `User: ${userName}, Time: ${date}, Place: <a href="${link}" target="_blank">${place.latitude}, ${place.longitude}</a>`;
            // add a line break
            document.getElementById('submissions').innerHTML += '<br>';
        });
    });
}