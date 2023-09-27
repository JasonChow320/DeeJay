import './App.css';
import React, {Component} from 'react';
import View from './View';
import Cookies from 'universal-cookie';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            displayArray : [],
            artists: [], 
            genre: "", 
            track: "", 
            deejay_code : "",
            session : 'none',
            username : '',
            password : '',
            email : '',
            link : 'http://localhost:3001/spotifyapi/login',
            makeAcc : false,
            loggedIn : false,
            loginSpotify : false,
            deleteAcc : false
        };   
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.search = this.search.bind(this);
        this.join_deejay_session = this.join_deejay_session.bind(this);
        this.addItems = this.addItems.bind(this);
        this.getSpotifyNewReleases = this.getSpotifyNewReleases.bind(this);
        this.getSpotifyCategories = this.getSpotifyCategories.bind(this);
        this.getSpotifyGenre = this.getSpotifyGenre.bind(this);
        this.getSpotifyFeaturedPlaylist = this.getSpotifyFeaturedPlaylist.bind(this);
        this.loginSubmit = this.loginSubmit.bind(this);
        this.loginPanel = this.loginPanel.bind(this);
        this.AccSubmit = this.AccSubmit.bind(this);
        this.toggleAccount = this.toggleAccount.bind(this);
        this.signout = this.signout.bind(this);
        this.toggleDelete = this.toggleDelete.bind(this);
        this.deleteAcc = this.deleteAcc.bind(this);
    }

    handleChange({target}) {
        this.setState({
            [target.name]: target.value
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        this.join_deejay_session();
    }

    join_deejay_session() {
        let data = {deejay_code: this.state.deejay_code}
        fetch('http://localhost:3001/deejay/join_session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
            })
            .then(res => alert(res.text()))
    }

    search() {
        this.searchTrack();
    }
  
    getSpotifyNewReleases(){
        let ip = '/spotifyapi/nr';
        var arrAlbums = [];

        fetch(ip, {
            method: 'GET',
        })
        .then(res => res.json())
        .then(result => {
            let length = result.albums.limit;

            for(var i = 0; i < length; i++){
                arrAlbums.push([result.albums.items[i].name, result.albums.items[i].id, result.albums.items[i].images[0].url]);
            }
            this.setState({ 
                displayArray : arrAlbums,
                type : 'Albums'
            });
            }
        );
    }

    getSpotifyCategories(){
        let ip = '/spotifyapi/categories';
        fetch(ip, {
            method: 'GET',
        })
        .then(res => res.json())
        .then(result => {
            let result_json = JSON.parse(result);
            let categories = [];
            let length = result_json.categories.limit;
            for(var i = 0; i < length; i++){
                categories.push([result_json.categories.items[i].name, result_json.categories.items[i].id,
                    result_json.categories.items[i].icons[0].url]);
            }
            
            this.setState({ 
                displayArray : categories,
            });
            }
        );
    }

    getSpotifyGenre(){
        let ip = '/spotifyapi/genre';
        fetch(ip, {
            method: 'GET',
        })
        .then(res => res.json())
        .then(result => {
            let result_json = JSON.parse(result);
            let genres = [];
            let length = result_json.genres.length;
            for(var i = 0; i < length; i++){
                genres.push([result_json.genres[i]]);
            }
            
            this.setState({ 
                displayArray : genres,
            });
            }
        );
    }

    getSpotifyFeaturedPlaylist(){
        let ip = '/spotifyapi/featuredplaylist';
        fetch(ip, {
            method: 'GET',
        })
        .then(res => res.json())
        .then(result => {
            let result_json = JSON.parse(result);
            let playlist = [];
            for(var i = 0; i < 20; i++){
                playlist.push([result_json.playlists.items[0].name, result_json.playlists.items[0].id]);
            }
            
            this.setState({ 
                displayArray : playlist,
            });
        }   
        );
    }

    addItems() {
        let uris_str = "";
        for(var i = 0; i < 20; i++) {
          uris_str = uris_str + 'spotify:track:' + this.state.arrIds[i] + ',';
        }
        let pid = this.state.playlistID
        const data = {playlistID: pid, uris: uris_str}

        console.log(pid);

        const cookies = new Cookies();
        cookies.set('sessionId', this.state.session);
        fetch('/spotifyapi/additems', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(res => res.text())
        .then(res => this.setState({playlistSnap: res}));
    }

    componentDidMount() {
        let a_token = window.location.search;
        if (a_token) {
            if (a_token.slice(0, 11) === "?sessionId=") {
                this.setState({
                    session: a_token.slice(11),
                    loginSpotify : true, 
                    loggedIn : false,
                });
                window.history.pushState({}, null, "/");
            }else if (a_token.slice(0, 14) === "?loginSession=") {
                this.setState({
                    session: a_token.slice(14), 
                    loggedIn : true, 
                    link : 'http://localhost:3001/spotifyapi/loginWithAcc/'+a_token.slice(15),
                    loginSpotify : true,
                });
                window.history.pushState({}, null, "/");
            }else if(a_token.slice(0, 7) === "?error="){
                alert(a_token.slice(7));
                this.setState({
                    loggedIn : false,
                    loginSpotify : false,
                });
                window.history.pushState({}, null, "/");
            }
        }
    }

    loginSubmit(event){
        event.preventDefault();
        const {username, password} = this.state;
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        var data = JSON.stringify({
            "username": username,
            "password": password
        });
      
        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: data,
            redirect: 'follow'
        };
      
        fetch("/login/userlogin", requestOptions)
        .then(response => response.json())
        .then(result =>{
            if(result.error !== null){
              alert(result.error);
            }else{
                if(result.sessionId!=null){
                    if(result.havespotify===false){
                        this.setState({
                            session : result.sessionId,
                            loggedIn : true,
                            loginSpotify : false,
                            link : 'http://localhost:3001/spotifyapi/loginWithAcc/'+result.sessionId
                        });
                    }else{
                        this.setState({
                            session : result.sessionId,
                            loggedIn : true,
                            loginSpotify : true,
                            link : 'http://localhost:3001/spotifyapi/loginWithAcc/'+result.sessionId
                        });
                    }
                }
            }
        });
    }

    AccSubmit(event){
        event.preventDefault();
        const {username, password, email} = this.state;
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        var data = JSON.stringify({
            "username": username,
            "password": password,
            "email": email
        });
      
        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: data,
            redirect: 'follow'
        };
      
        fetch("/login/user", requestOptions)
        .then(response => response.json())
        .then(result =>{
            if(result.sessionId!=null){
                this.setState({
                    loggedIn : true,
                    session : result.sessionId,
                    loginSpotify : false,
                    link : 'http://localhost:3001/spotifyapi/loginWithAcc/'+result.sessionId
                });
            }
            if(result.error!=null){
                this.setState({
                    message : result.error
                });
            }
        });
    }

    toggleAccount(){
        const {makeAcc} = this.state;
        this.setState({
            makeAcc : !makeAcc
        });
    }

    toggleDelete(){
        const {deleteAcc} = this.state;
        this.setState({
            deleteAcc : !deleteAcc
        })
    }

    deleteAcc(){
        const {username} = this.state;
        if(username !== ''){
            var requestOptions = {
                method: 'delete',
                redirect: 'follow'
            };
          
            fetch("/login/delete_user/" + username, requestOptions)
            .then(response => response.json())
            .then(result =>{
                if(result.error!=null){
                    alert("hi");
                    alert(result.error);
                }else{
                    alert(result.message);
                    this.setState({
                        username : '',
                        password : '',
                        session : 'none',
                        deleteAcc : false,
                        makeAcc : false
                    });
                }
            });
        }
    }
  
    signout(){
        this.setState({
            loggedIn : false,
            loginSpotify : false,
            session : 'none',
            username : '',
            password : '',
            email : '',
            makeAcc : false
        });
    }

    /* from https://stackoverflow.com/questions/22639534/pass-props-to-parent-component-in-react-js */
    handleChildClick(event) {
        // You can access the prop you pass to the children 
        // because you already have it! 
        // Here you have it in state but it could also be
        //  in props, coming from another parent.
        alert("The Child button text is: ");
        // You can also access the target of the click here 
        // if you want to do some magic stuff
        alert("The Child HTML is: " + event.target.outerHTML);
    }


    /*loggedIn - boolean if the user has logged in using our software account
    makeAcc - boolean if the user is in the process of making an account for our software
    loginSpotify - boolean if the user has logged into Spotify
    link - a string containing the link to login to Spotify  */
    loginPanel(loggedIn, makeAcc, loginSpotify, link, message, deleteAcc, username){
        if(!loggedIn) {
            if(makeAcc) {
                return (
                    <div>
                    <form onSubmit={this.AccSubmit}>
                        <label>
                            Username:
                            <input type="text" name="username" value={this.state.username} onChange={this.handleChange} />
                        </label><br></br>
                        <label>
                            Password:
                            <input type="text" name="password" value={this.state.password} onChange={this.handleChange} />
                        </label><br></br>
                        <label>
                            Email:
                            <input type="text" name="email" value={this.state.email} onChange={this.handleChange} />
                        </label><br></br>
                        <input type="submit" value="Create" />
                    </form>
                    <button onClick={this.toggleAccount}>Return to Login</button>
                    {message || 'none'}
                    </div>
                );
            } else {
                return (
                    <div>
                        <form onSubmit={this.loginSubmit}>
                            <label>
                                Username:
                                <input type="text" name="username" value={this.state.username} onChange={this.handleChange} />
                            </label><br></br>
                            <label>
                                Password:
                                <input type="text" name="password" value={this.state.password} onChange={this.handleChange} />
                            </label><br></br>
                            <input type="submit" value="Login" />
                        </form>
                        <button onClick={this.toggleAccount}>Sign Up</button>
                        <br></br>
                        <a className="App-link" href={link}>Log In To Spotify without an Account</a>
                    </div>
                );
            }
        } else {
            if(loginSpotify) {
                if(deleteAcc) {
                    return (
                        <div>
                            <button onClick={this.signout}>Sign Out</button>
                            <h1>YOU SURE?</h1>
                            <p>{this.username}</p>
                            <button onClick={this.deleteAcc}>Yes</button>
                            <button onClick={this.toggleDelete}>No</button>
                        </div>
                    );
            } else {
                return (
                    <div>
                        <button onClick={this.signout}>Sign Out</button>
                        <button onClick={this.toggleDelete}>Delete Account</button>
                    </div>
                );
            }
        } else {
            if(deleteAcc){
                return (
                    <div>
                        <button onClick={this.signout}>Sign Out</button>
                        <h1>YOU SURE?</h1>
                        <button onClick={this.deleteAcc}>Yes</button>
                        <button onClick={this.toggleDelete}>No</button>
                        <a className="App-link" href={link}>Log In To Spotify</a>
                    </div>);
            } else {
                return (
                    <div>
                        <button onClick={this.signout}>Sign Out</button>
                        <button onClick={this.toggleDelete}>Delete Account</button>
                        <a className="App-link" href={link}>Log In To Spotify</a>
                    </div>);
            }
        }
    }
}

render() {
    const {displayArray, session, makeAcc, link, loggedIn, loginSpotify, message, deleteAcc, username} = this.state;
    const login = this.loginPanel(loggedIn, makeAcc, loginSpotify, link, message, deleteAcc, username);

    // if no session id, then display login screen
    if (session === "none") {
        return (
            <div id="intro">
                {login}
            </div>
        )
    }

    // else display main application
    return (
        <div>
            <div className="nav">
                <div id="navLeft">

                <p>{session || 'none'}</p>
                <form onSubmit={this.handleSubmit}>
                <label>
                    DeeJay Session Code
                    <input type="text" name="deejay_code" value={this.state.deejay_code} onChange={this.handleChange} />
                </label>
                <input type="submit" value="Submit" />
                </form>

                <button onClick={this.join_deejay_session}>Join Session</button>
                <div id="spotifyBrowse">
                    <button onClick={this.getSpotifyCategories}>Categories</button>
                    <button onClick={this.getSpotifyGenre}>Genres</button>
                    <button onClick={this.getSpotifyNewReleases}>NewReleases</button>  
                    <button onClick={this.getSpotifyFeaturedPlaylist}>FeaturedPlaylist</button>  
                </div>
            </div>

            <div id="login">
                {login}
            </div>
        </div>
        <div id="display">
            <View arr={displayArray} onClick={this.handleChildClick}></View>
        </div>
    </div>
    );
  }
}

export default App;
