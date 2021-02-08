
const url = "https://azhartwitterapp.herokuapp.com";
// const url = "http://localhost:5000";
// document.getElementById("date").innerHTML = new Date('2019-06-11')
timeago().render(document.querySelectorAll('.timeago'));
var socket = io(url);

socket.on('connect', function () {
    // console.log("I am connected");
});


const signup = () => {

    var userEmail = document.getElementById("email").value.toLowerCase();
    var userPassword = document.getElementById("password").value
    var userName = document.getElementById("name").value

    let obj = {
        userEmail: userEmail,
        userPassword: userPassword,
        userName: userName,
    };

    const Http = new XMLHttpRequest();
    Http.open("POST", url + "/auth/signup");
    Http.setRequestHeader("Content-Type", "application/json");
    Http.send(JSON.stringify(obj));

    Http.onreadystatechange = (e) => {

        if (Http.readyState === 4) {
            let jsonRes = JSON.parse(Http.responseText)
            // console.log(Http.status);
            if (Http.status === 200) {
                alert(jsonRes.message);
                window.location.href = "login.html";
            }
            else {
                alert(jsonRes.message);
            }
        }
    }
    return false;
}

const login = () => {

    var userEmail = document.getElementById("email").value.toLowerCase();
    var userPassword = document.getElementById("password").value

    obj = {
        userEmail: userEmail,
        userPassword: userPassword,
    }
    // console.log(obj);

    const Http = new XMLHttpRequest();

    Http.open("POST", url + "/auth/login");
    Http.setRequestHeader("Content-Type", "application/json");
    Http.send(JSON.stringify(obj));

    Http.onreadystatechange = (e) => {
        if (Http.readyState === 4) {
            // console.log(Http.responseText);
            let jsonRes = JSON.parse(Http.responseText);

            if (Http.status === 200) {
                alert(jsonRes.message);
                window.location.href = "dashboard.html";
            }
            else {
                alert(jsonRes.message);
            }

        }
    }
    return false;
}

function getProfile() {
    // console.log("url=>", url);
    axios({
        method: 'get',
        url: url + "/profile",
    }).then((response) => {
        // console.log("welcoming user==>", response);
        // console.log(response.data);
        document.getElementById('welcomeUser').innerHTML = response.data.profile.userName;
        sessionStorage.setItem("userEmail", response.data.profile.userEmail);
        if (response.data.profile.profileUrl) {
            document.getElementById("fileInput").style.display = "none";
            document.getElementById("profilePic").src = response.data.profile.profileUrl;
            document.getElementById("avatar").src = response.data.profile.profileUrl;
            document.getElementById("tweetText").placeholder = `What's on your mind, ${response.data.profile.userName}?`;

        }
        else {
            document.getElementById("uploadTxt").innerHTML = "Upload profile picture";
            document.getElementById("fileInput").setAttribute("id", "fileInput");
            document.getElementById("avatar").src = "./image/image.png";
        }
        getTweets();
    }, (error) => {
        // console.log(error.message);
        location.href = "./login.html"
        // console.log("this is my error", error);
    });

}

function forgot_password() {
    axios({
        method: 'post',
        url: url + "/auth/forget-password",
        data: {
            userEmail: document.getElementById("email").value,
        }
    }).then((response) => {
        // console.log("response=>",response.data);
        document.getElementById("forgot-response").style.display = "initial";
        document.getElementById("forgot-response").innerHTML = JSON.stringify(response.data.message);
        alert((response.data.message));
        localStorage.setItem("forgot_email", document.getElementById("email").value);
        window.location.href = "reset-password.html";
    }, (error) => {
        document.getElementById("forgot-response").style.display = "initial";
        document.getElementById("forgot-response").innerHTML = (error.response.data.message);
    })
    return false;
}

function checkOtp() {
    var forgot_email = (localStorage.getItem("forgot_email"))
    const Http = new XMLHttpRequest();
    Http.open("POST", url + "/auth/forget-password-step-2")
    Http.setRequestHeader("Content-Type", "application/json");
    Http.send(JSON.stringify({
        userEmail: forgot_email,
        newPassword: document.getElementById("newPassword").value,
        otp: document.getElementById("otp").value,
    }))
    Http.onreadystatechange = (e) => {

        if (Http.readyState === 4) {
            let jsonRes = JSON.parse(Http.responseText);
            if (Http.status === 200) {
                alert(jsonRes.message);
                window.location.href = "login.html";
            }
            else {
                document.getElementById("forgot-response").style.display = "initial";
                document.getElementById("forgot-response").innerHTML = jsonRes.message;
                alert(jsonRes.message);
            }
        }
    }

    return false;

}


const getTweets = () => {

    document.getElementById("posts").innerHTML = "";
    const Http = new XMLHttpRequest();
    Http.open("GET", url + "/getTweets");
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState === 4) {

            data = JSON.parse((Http.responseText));
            tweets = data.tweets;

            profileUrl = data.profileUrl
            for (let i = 0; i < tweets.length; i++) {
                for (let j = 0; j < profileUrl.length; j++) {
                    if (tweets[i].userEmail === profileUrl[j].userEmail) {
                        tweets[i].profileUrl = profileUrl[j].profileUrl;
                    }
                }
            }

            for (let i = 0; i < tweets.length; i++) {

                date = moment((tweets[i].createdOn)).fromNow()
                // if (data.tweets[i].userEmail !== userEmail) {
                var eachTweet = document.createElement("li");
                if (tweets[i].profileUrl) {
                    if (!tweets[i].tweetImage) {
                        eachTweet.innerHTML =
                            `         
                            <img src="${tweets[i].profileUrl}" alt="Avatar" class="avatar">  
                            <h4 class="userName">
                            ${tweets[i].userName}
                        </h4> 
                        <small class="timeago">${date}</small>

                        <p class="userPost" datetime=${date}>
                            ${tweets[i].tweetText}
                        </p>

                        `
                    }
                    else {


                        eachTweet.innerHTML =
                            `            

            <img src="${tweets[i].profileUrl}" alt="Avatar" class="avatar">  
            <h4 class="userName">
            ${tweets[i].userName}
        </h4> 
        <small class="timeago">${date}</small>
    
        <p class="userPost" datetime=${date}>
            ${tweets[i].tweetText}
        </p>
        <img class="tweetPostImage"  src=${tweets[i].tweetImage}>
        `
                    }
                }
                else {
                    if (!tweets[i].tweetImage) {

                        eachTweet.innerHTML =
                            `            
            <img src="./image/image.png" alt="Avatar" class="avatar">  
            <h4 class="userName">
            ${tweets[i].userName}
        </h4> 
        <small class="timeago">${date}</small>
    
        <p class="userPost" datetime=${date}>
            ${tweets[i].tweetText}
        </p>`
                    }
                    else {
                        eachTweet.innerHTML =
                            `            
            <img src="./image/image.png" alt="Avatar" class="avatar">  
            <h4 class="userName">
            ${tweets[i].userName}
        </h4> 
        <small class="timeago">${date}</small>
    
        <p class="userPost" datetime=${date}>
            ${tweets[i].tweetText}
        </p>
        <img class="tweetPostImage"  src=${tweets[i].tweetImage}>
        `

                    }
                }
                // console.log(`User: ${tweets[i]} ${tweets[i].userPosts[j]}`)
                document.getElementById("posts").appendChild(eachTweet)
                // }
            }
        }
    }

}



const postTweet = () => {
    tweetImage = document.getElementById("tweetImage")

    if (!tweetImage.value) {
        const Http = new XMLHttpRequest();
        Http.open("POST", url + "/postTweet")
        Http.setRequestHeader("Content-Type", "application/json");
        Http.send(JSON.stringify({
            userEmail: sessionStorage.getItem("userEmail"),
            tweetText: document.getElementById("tweetText").value,
        }))
        document.getElementById("tweetText").value = "";


    }
    else {

        let formData = new FormData();
        formData.append("myFile", tweetImage.files[0]);
        formData.append("tweetText", document.getElementById("tweetText").value);

        axios({
            method: 'post',
            url: url + "/postTweetwithImage",
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' }
        })
            .then(res => {

                document.getElementById("tweetText").value = " ";
                document.getElementById("tweetImage").value = null;
                // dont get confused with return false, it is there to prevent html page to reload/default behaviour, and this have nothing to do with actual file upload process but if you remove it page will reload on submit -->
            })
            .catch(err => {
                console.log(err);

            })
    }

    return false;  // dont get confused with return false, it is there to prevent html page to reload/default behaviour, and this have nothing to do with actual file upload process but if you remove it page will reload on submit -->





}

const myTweets = () => {
    document.getElementById("posts").innerHTML = "";
    const Http = new XMLHttpRequest();
    Http.open("GET", url + "/myTweets");
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState === 4) {

            data = JSON.parse((Http.responseText));
            profileUrl = data.profileUrl
   
            tweets = data.tweets;
            for (let i = 0; i < tweets.length; i++) {
               tweets[i].profileUrl = profileUrl
            }
        

            for (let i = 0; i < data.tweets.length; i++) {
                date = moment((data.tweets[i].createdOn)).fromNow()
                // if (data.tweets[i].userEmail !== userEmail) {
                var eachTweet = document.createElement("li");
                if (data.tweets[i].profileUrl) {
                    if (!data.tweets[i].tweetImage) {
                        eachTweet.innerHTML =
                            `         
                            <img src="${data.tweets[i].profileUrl}" alt="Avatar" class="avatar">  
                            <h4 class="userName">
                            ${data.tweets[i].userName}
                        </h4> 
                        <small class="timeago">${date}</small>

                        <p class="userPost" datetime=${date}>
                            ${data.tweets[i].tweetText}
                        </p>

                        `
                    }
                    else {


                        eachTweet.innerHTML =
                            `            

            <img src="${data.tweets[i].profileUrl}" alt="Avatar" class="avatar">  
            <h4 class="userName">
            ${data.tweets[i].userName}
        </h4> 
        <small class="timeago">${date}</small>
    
        <p class="userPost" datetime=${date}>
            ${data.tweets[i].tweetText}
        </p>
        <img class="tweetPostImage"  src=${data.tweets[i].tweetImage}>
        `
                    }
                }
                else {
                    if (!data.tweets[i].tweetImage) {

                        eachTweet.innerHTML =
                            `            
            <img src="./image/image.png" alt="Avatar" class="avatar">  
            <h4 class="userName">
            ${data.tweets[i].userName}
        </h4> 
        <small class="timeago">${date}</small>
    
        <p class="userPost" datetime=${date}>
            ${data.tweets[i].tweetText}
        </p>`
                    }
                    else {
                        eachTweet.innerHTML =
                            `            
            <img src="./image/image.png" alt="Avatar" class="avatar">  
            <h4 class="userName">
            ${data.tweets[i].userName}
        </h4> 
        <small class="timeago">${date}</small>
    
        <p class="userPost" datetime=${date}>
            ${data.tweets[i].tweetText}
        </p>
        <img class="tweetPostImage"  src=${data.tweets[i].tweetImage}>
        `

                    }
                }



                // console.log(`User: ${tweets[i]} ${tweets[i].userPosts[j]}`)
                document.getElementById("posts").appendChild(eachTweet)
                // }
            }
        }
    }
}

socket.on("NEW_POST", (newPost) => {


    var eachTweet = document.createElement("li");
    if (newPost.profileUrl) {
        if (newPost.tweetImage) {
            eachTweet.innerHTML =
                `
                <img src="${newPost.profileUrl}" alt="Avatar" class="avatar">  
                <h4 class="userName">
                ${newPost.userName}
            </h4> 
            <small class="timeago">${moment(newPost.createdOn).fromNow()}</small>
            <p class="userPost">
                ${newPost.tweetText}
            </p>
            <img class="tweetPostImage"  src=${newPost.tweetImage}>
            `;
           

        }
        else {
            eachTweet.innerHTML =
                `
                <img src="${newPost.profileUrl}" alt="Avatar" class="avatar">  
                <h4 class="userName">
                ${newPost.userName}
            </h4> 
            <small class="timeago">${moment(newPost.createdOn).fromNow()}</small>
            <p class="userPost">
                ${newPost.tweetText}
            </p>
            `;

        
        }
    }

    else {
        if (newPost.tweetImage) {
            eachTweet.innerHTML =
                `
        <img src="./image/image.png" alt="Avatar" class="avatar">  
        <h4 class="userName">
        ${newPost.userName}
    </h4> 
    <small class="timeago">${moment(newPost.createdOn).fromNow()}</small>
    <p class="userPost">
        ${newPost.tweetText}
    </p>
    <img class="tweetPostImage"  src=${newPost.tweetImage}>
    `;
           


        }
        else {
            eachTweet.innerHTML =
                `
    <img src="./image/image.png" alt="Avatar" class="avatar">  
    <h4 class="userName">
    ${newPost.userName}
</h4> 
<small class="timeago">${moment(newPost.createdOn).fromNow()}</small>
<p class="userPost">
    ${newPost.tweetText}
</p>`;
     


        }
   
    }
    document.getElementById("posts").appendChild(eachTweet)
})


let logout = () => {
    axios({
        method: "post",
        url: url + "/auth/logout",
    }).then((response) => {
        alert(response.data);
        sessionStorage.removeItem("userEmail");
        window.location.href = "login.html";
    })
}

function uploadProfilePic() {

    var fileInput = document.getElementById("fileInput");

    // // To convert a File into Blob (not recommended)
    // var blob = null;
    // var file = fileInput.files[0];
    // let reader = new FileReader();
    // reader.readAsArrayBuffer(file)
    // reader.onload = function (e) {
    //     blob = new Blob([new Uint8Array(e.target.result)], { type: file.type });
    //     console.log(blob);
    // }


    // console.log("fileInput: ", fileInput);
    // console.log("fileInput: ", fileInput.files[0]);

    let formData = new FormData();
    // https://developer.mozilla.org/en-US/docs/Web/API/FormData/append#syntax

    formData.append("myFile", fileInput.files[0]); // file input is for browser only, use fs to read file in nodejs client
    // formData.append("myFile", blob, "myFileNameAbc"); // you can also send file in Blob form (but you really dont need to covert a File into blob since it is Actually same, Blob is just a new implementation and nothing else, and most of the time (as of january 2021) when someone function says I accept Blob it means File or Blob) see: https://stackoverflow.com/questions/33855167/convert-data-file-to-blob
    formData.append("myName", "malik"); // this is how you add some text data along with file
    formData.append("myDetails",
        JSON.stringify({
            "userEmail": sessionStorage.getItem("userEmail"),   // this is how you send a json object along with file, you need to stringify (ofcourse you need to parse it back to JSON on server) your json Object since append method only allows either USVString or Blob(File is subclass of blob so File is also allowed)
            "year": "2021"
        })
    );

    // you may use any other library to send from-data request to server, I used axios for no specific reason, I used it just because I'm using it these days, earlier I was using npm request module but last week it get fully depricated, such a bad news.
    axios({
        method: 'post',
        url: url + "/upload",
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
    })
        .then(res => {
            document.getElementById("uploadTxt").innerHTML = ""
            document.getElementById("profilePic").src = res.data.url;
            document.getElementById("avatar").src = res.data.url;

        })
        .catch(err => {
            console.log(err);
        })

    return false; // dont get confused with return false, it is there to prevent html page to reload/default behaviour, and this have nothing to do with actual file upload process but if you remove it page will reload on submit -->

}


// function previewFile() {
//     const preview = document.querySelector('img');
//     const file = document.querySelector('input[id=fileInput]').files[0];
//     const reader = new FileReader();

//     reader.addEventListener("load", function () {
//         // convert image file to base64 string
//         preview.src = reader.result;
//     }, false);

//     if (file) {
//         reader.readAsDataURL(file);
//         document.getElementById("uploadBtn").style.display = "initial";
//         document.getElementById("uploadTxt").innerHTML = "Press upload to upload profile picture";
//     }
// }

function changeText() {
    document.getElementById("uploadPicture").style.display = "block";
}
function hideText() {
    document.getElementById("uploadPicture").style.display = "none";
}