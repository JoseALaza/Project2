import './App.css';
import './Board.css';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import ReactDOM from "react-dom";
import io from 'socket.io-client';
import { PlayerBoardCreate, SpectatorBoardCreate } from './Board.js';


const socket = io();
let username;

function App() {

  

  // Serves to control the username of the current user. (could possibly use this as login state)
  const [user, setUser] = useState('');

  // 0 refers to the current user not logged in, 1 is the user already logged in
  const [loginState, setLogin] = useState(0);

  // Local array that is updated via server to maintain a total list of 'connected' users
  const [userList, addUser] = useState([]);

  // Local array that is updated via server to define who is player and spectator. Should be a max size of 2
  const [playerDef, updateDef] = useState([]);

  console.log("PRELOAD",userList);

  const usernameInput = useRef(null); // Serves to extract username textbox

  // Listening for the server usernameAdd response from the server to update other users.
  // (Needs to be checked for errors as it could update twice for self user)
  useEffect(() => {
    socket.on('usernameAdd', (data) => { // Listening for usernameAdd from server
       
      addUser(prev => [...prev, data]); // Updates userList array
    });

    // Cleanup function. Not sure what could be done
    return function cleanup() {
      console.log('A');
    };


  }, []);

  // Listening for the server usernameRemove response from the server to update other users.
  // (Needs to be checked for errors as it could update twice for self user)
  useEffect(() => {
    socket.on('usernameRemove', (data) => { // Listening for usernameAdd from server
       
      addUser(prev => itemRemove(prev, data)); // Updates userList array with removal function
    });

    // Cleanup function. Not sure what could be done
    return function cleanup() {
      console.log('B');
    };


  }, []);

  // Listening for the server playerDefine response from server updating allowed players and spectators.
  // Should be updated based on everytime someone logs in and logs out.
  // (Needs to be checked for errors as it could update twice for self user or may not update for self)
  useEffect(() => {
    socket.on('playerDefine', (data) => { // Listening for playerDefine from server
        
      updateDef(data); // Overwrite old array to update define
    });

    // Cleanup function. Not sure what could be done
    return function cleanup() {
      console.log('C');
    };


  }, []);

  // Listening for the server userUpdate response from server updating userList checking for repetitions.
  // Should update based on everytime someone connects.
  useEffect(() => {
    socket.on('userUpdate', (data) => { // Listening for userUpdate from server
      console.log("USERUPDATE",data);  
      addUser(prev=>data); // Overwrite old array to update userList
    });

    // Cleanup function. Not sure what could be done
    return function cleanup() {
      console.log('D');
    };


  }, []);

  useEffect(() => {
    socket.on('forfeit', (data) => { // Listening for userUpdate from server
        
      if (user != '') {
        alert('Player Forfeited!');
          
      }
    });
    
    return function cleanup() {
      socket.offAny('forfeit');
    };
    
  },[]);

  // Array removal similiar to .pop()
  function itemRemove(arr, item) {
      
    for (var i = 0; i < arr.length; i++) {

      if (arr[i] === item) {

        arr.splice(i, 1);
      }

    }
      
    return arr;
  }

  // Button function for Login sending username to the current state.
  // Sets loginState to render Logout Page
  function onClickLogin() {
    // Checks that the user has inputed something and that the name is unique
    // Does not account for users entering the name at the same time or possibly resseting local list.
    
    console.log("ONCLICKLOGIN",userList);
    
    if (usernameInput != null && userList.includes(usernameInput.current.value) === false && usernameInput.current.value != '') {
      username = usernameInput.current.value;

      socket.emit('userLogin', username); // Sends raw username string to server for proccessing

      // Updates the local array of user list
      // addUser(prev => [...prev, username]);

      // States used to determine user's log information
      setLogin(1);
      setUser(username);
    }
    else {
      // Alerts the user to try another username
      // Could possibly check the database and validate the users name beforehand
      alert('USERNAME TAKEN!\n ' + usernameInput.current.value);
    }
  }

  // Button functino for Logout removing username from state.
  // Resets loginState to render to Login Page
  function onClickLogout() {
    socket.emit('userLogout', user); // Sends username of current user to serer for proccessing

    // Removes the username from the list
    addUser(prev => itemRemove(prev, user));

    // States used to determine user's log information
    setLogin(0);
    setUser('');
  }

  useEffect(()=>{
    window.addEventListener("beforeunload", onUnload);
    
    return () => {
      window.removeEventListener("beforeunload", onUnload);
    };
    
  });
  
  const onUnload = () => {
    socket.emit("tabClose",user);
    console.log("INSIDE onUnload");
    window.fetch("/").then(r => console.log("working fine", r));
  };
  

  // Renders a login page to users by default
  if (!loginState) {
    return (
      <div>
        <h1>Login page</h1>
        <label>Username:</label>
        <input type="text" ref={usernameInput} required/>
        <button onClick={onClickLogin}>Send</button>
      </div>
    );
  }

  // Renders a logout page once a user has submitted a valid username
  if (loginState) {
    if (playerDef.includes(user)) { // Designates the user to the player page based on the first two in queue
      if (playerDef.length == 1) {
        return (
          <div>
            <h1>Logout page - {user} - player {user == playerDef[0]?'X':'O'}</h1>
            <button onClick={onClickLogout}>Logout</button>
            <div id='info'>
              Waiting for player
            </div>
          </div>
        );
      }
      return (
        <div>
          <h1>Logout page - {user} - player {user == playerDef[0]?'X':'O'}</h1>
          <h2>Playing Against - {user != playerDef[0]?playerDef[0]:playerDef[1]}</h2>
          <button onClick={onClickLogout}>Logout</button>
          <div id='info'>
            <PlayerBoardCreate playerOne_playerTwo={user == playerDef[0]?'X':'O'}/>
          </div>
          <ul>
            {userList.map((item, index) => <li key={index}> {item} </li>)}
          </ul>
        </div>
      );
    }
    else { // Designates user to the spectator page. Should change when others logout
      return (
        <div>
          <h1>Logout page - {user} - spectator</h1>
          <h2>Users: X-{playerDef[0]} vs O-{playerDef[1]}</h2>
          <button onClick={onClickLogout}>Logout</button>
          <div id='info'>
            <SpectatorBoardCreate />
          </div>
          <ul>
            {userList.map((item, index) => <li key={index}> {item} </li>)}
          </ul>
        </div>
      );
    }
  }
}

export default App;
