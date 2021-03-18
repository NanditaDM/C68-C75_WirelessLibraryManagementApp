import firebase from 'firebase/app' 
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';

var firebaseConfig = {
  apiKey: "AIzaSyCd2yJjAjiPcYSISMrMyPcPbrnPfPKUpgo",
  authDomain: "librarymanagementapp-b026a.firebaseapp.com",
  projectId: "librarymanagementapp-b026a",
  storageBucket: "librarymanagementapp-b026a.appspot.com",
  messagingSenderId: "794636252734",
  appId: "1:794636252734:web:c74aac15a8d80547ddc36f"
};
firebase.initializeApp(firebaseConfig);
export default firebase.firestore();