import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Image, StyleSheet, KeyboardAvoidingView, ToastAndroid, Alert } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import db from '../config.js';
import firebase from 'firebase';

export default class TransactionScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      hasCameraPermissions: null,
      scanned: false,
      scannedBookId: '',
      scannedStudentId: '',
      buttonState: 'normal'
    }
  }

  handleTransaction = async () => {
    var transactionMessage

    var transactionType = await this.checkBookEligibility();

    if (!transactionType){
      Alert.alert("This book doesn't exist in library in database.")
      this.setState({
        scannedBookId: '',
        scannedStudentId: ''
      })
    } else if (transactionType === "issue"){
      var isStudentEligible = await this.studentEligibilityForIssue();
      if (isStudentEligible) {
        this.initiateBookIssue();
        Alert.alert("The book has been issued to the student.")
      } 
    } else {
      var isStudentEligible = await this.studentEligibilityForReturn();
      if (isStudentEligible) {
        this.initiateBookReturn();
        Alert.alert("The book has been returned to the library.")
      } 
    }

    db.collection("books").doc(this.state.scannedBookId).get()
      .then(doc => {
        var book = doc.data()
        if (book.availablity) {
          this.initiateBookIssue()
          transactionMessage = "Book issue",
            //Alert.alert(transactionMessage)
            ToastAndroid.show(transactionMessage, ToastAndroid.SHORT)
        }
        else {
          this.initiateBookReturn()
          transactionMessage = "Book return",
            //Alert.alert(transactionMessage)
            ToastAndroid.show(transactionMessage, ToastAndroid.SHORT)
        }
      })
  }

  checkBookEligibility = async () => {
      const bookRef = await db
        .collection("books")
        .where("bookId", "==", this.state.scannedBookId)
        .get();
      var transactionType = "";
      if (bookRef.docs.length == 0) {
        transactionType = false;
      } else {
        bookRef.docs.map(doc => {
          var book = doc.data();
          if (book.bookAvailability) {
            transactionType = "issue";
          } else {
            transactionType = "return";
          }
        });
      }
  
      return transactionType;
    };

  studentEligibilityForIssue = async () => {
      const studentRef = await db
        .collection("students")
        .where("studentId", "==", this.state.scannedStudentId)
        .get();
      var isStudentEligible = "";
      if (studentRef.docs.length == 0) {
        this.setState({
          scannedStudentId: "",
          scannedBookId: ""
        });
        isStudentEligible = false;
        Alert.alert("The student ID doesn't exist in the database!");
      } else {
        studentRef.docs.map(doc => {
          var student = doc.data();
          if (student.numberOfBooksIssued < 2) {
            isStudentEligible = true;
          } else {
            isStudentEligible = false;
            Alert.alert("The student has already issued 2 books!");
            this.setState({
              scannedStudentId: "",
              scannedBookId: ""
            });
          }
        });
      }

      return isStudentEligible;
    };

  studentEligibilityForReturn = async () => {
    const transactionRef = await db
        .collection("transactions")
        .where("bookId", "==", this.state.scannedBookId)
        .limit(1)
      .get();
      var isStudentEligible = "";
      transactionRef.docs.map(doc => {
        var lastBookTransaction = doc.data();
        if (lastBookTransaction.studentId === this.state.scannedStudentId) {
          isStudentEligible = true;
        } else {
          isStudentEligible = false;
          Alert.alert("The book wasn't issued by this student!");
          this.setState({
            scannedStudentId: "",
            scannedBookId: ""
          });
        }
      });
      return isStudentEligible;
    };

  initiateBookIssue = async () => {
    db.collection('transactions').add({
      "studentId": this.state.scannedStudentId,
      "bookId": this.state.scannedBookId,
      "date": firebase.firestore.Timestamp.now().toDate(),
      "transactionType": "issue"
    })
    db.collection("books").doc(this.state.scannedBookId).update({
      "availability": false
    })
    db.collection("students").doc(this.state.scannedStudenId).update({
      "noOfBooksIssued": firebase.firestore.FilledValue.increment(1)
    })
  }

  initiateBookReturn = async () => {
    db.collection('transaction').add({
      "studentId": this.state.scannedStudentId,
      "bookId": this.state.scannedBookId,
      "date": firebase.firestore.Timestamp.now().toDate(),
      "transactionType": "return"
    })
    db.collection("books").doc(this.state.scannedBookId).update({
      "availability": true
    })
    db.collection("students").doc(this.state.scannedStudenId).update({
      "noOfBooksIssued": firebase.firestore.FilledValue.increment(-1)
    })
  }

  getCameraPermissions = async (id) => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" is true when user has granted permission
        status === "granted" is false when user has not granted the permission
      */
      hasCameraPermissions: status === "granted",
      buttonState: id,
      scanned: false
    });
  }

  handleBarCodeScanned = async ({ type, data }) => {
    const { buttonState } = this.state

    if (buttonState === "BookId") {
      this.setState({
        scanned: true,
        scannedBookId: data,
        buttonState: 'normal'
      });
    }
    else if (buttonState === "StudentId") {
      this.setState({
        scanned: true,
        scannedStudentId: data,
        buttonState: 'normal'
      });
    }

  }

  render() {
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;

    if (buttonState !== "normal" && hasCameraPermissions) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }

    else if (buttonState === "normal") {
      return (
        <KeyboardAvoidingView>
          <View style={styles.container}>
            <View>
              <Image
                source={require("../assets/booklogo.jpg")}
                style={{ width: 200, height: 200 }} />
              <Text style={{ textAlign: 'center', fontSize: 30 }}>Wily</Text>
            </View>
            <View style={styles.inputView}>
              <TextInput
                style={styles.inputBox}
                placeholder="Book Id"
                onChangeText={a => this.setState({ scannedBookId: a })}
                value={this.state.scannedBookId} />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => {
                  this.getCameraPermissions("BookId")
                }}>
                <Text style={styles.buttonText}>Scan</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputView}>
              <TextInput
                style={styles.inputBox}
                placeholder="Student Id"
                onChangeText={a => this.setState({ scannedStudentId: a })}
                value={this.state.scannedStudentId} />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => {
                  this.getCameraPermissions("StudentId")
                }}>
                <Text style={styles.buttonText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={async () => {
                  var transactionMessage = this.handleTransaction();
                  this.setState({
                    scannedStudentId: '',
                    scannedBookId: ''
                  })
                }}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  displayText: {
    fontSize: 15,
    textDecorationLine: 'underline'
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    margin: 10
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10
  },
  inputView: {
    flexDirection: 'row',
    margin: 20
  },
  inputBox: {
    width: 200,
    height: 40,
    borderWidth: 1.5,
    borderRightWidth: 0,
    fontSize: 20
  },
  scanButton: {
    backgroundColor: '#66BB6A',
    width: 50,
    borderWidth: 1.5,
    borderLeftWidth: 0
  }
});