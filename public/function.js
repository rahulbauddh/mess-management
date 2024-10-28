document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname;

  if(currentPage==='/userprofile'){
    var likebutton = document.querySelectorAll(".inc");

    likebutton.forEach(function(button){
      
      button.addEventListener("click",function(){
        var likes = {
          userid : "",//userid of user
          add : "",//add that if user likes
          remove : "",//remove if user dislike
          disremove : "",//remove that if downvote is present 
          upvote : 0,
          downvote : 0
        };
        let c_id = button.getAttribute("data-value1");
        let u_id = button.getAttribute("data-value4");
        let votes = button.getAttribute("data-value2");
        let downvotes = button.getAttribute("data-value6");
        let arr = button.getAttribute("data-value3").split(',');
        let dislike = button.getAttribute("data-value5").split(',');
        // find dislike button to corresponding c_id
        let dislikeButton = document.querySelector(`.dec[data-value1="${c_id}"]`);

        // if (!dislikeButton) {
        //   console.error("Dislike button not found!");
        //   // return;
        // }
        // else{
        //   console.log("found");
        // }
        // let likeArr = dislikeButton.getAttribute("data-value5").split(',');
        // let likeVotes = dislikeButton.getAttribute("data-value6");

        // console.log("Initial arr : ", arr);
        // console.log("dislike arr : ", dislike);

        let index = arr.indexOf(u_id); 
        // console.log("u_id:", u_id);
        // console.log("index:", index);

        if(index !== -1){  
          // console.log("decrease");
          votes--;      
          if(votes<0)
            votes=0;
          arr.splice(index, 1); 
          likes.add="";
          likes.remove=u_id;
        } else {
          // console.log("increase");
          votes++;
          let ind = dislike.indexOf(u_id); 
          // console.log("index of dislike :", ind);
          if(ind !== -1){
            dislike.splice(ind, 1); 
            downvotes--;
            if(downvotes<0)
              downvotes=0;
            button.setAttribute("data-value5", dislike.join(',')); 
            button.setAttribute("data-value6", downvotes); 
            likes.disremove=u_id;
          }
          arr.push(u_id); 
          likes.add=u_id;
          likes.remove="";
        }

        // console.log("Updated arr:", arr); 
        // console.log("Updated dislike arr:", dislike); 
        
        button.setAttribute("data-value3", arr.join(',')); 
        button.setAttribute("data-value2", votes); 
        dislikeButton.setAttribute("data-value5", arr.join(','));
        dislikeButton.setAttribute("data-value6", votes);
        dislikeButton.setAttribute("data-value3", dislike.join(','));
        dislikeButton.setAttribute("data-value2", downvotes);

        likes.userid=c_id;
        likes.upvote=votes;
        likes.downvote=downvotes;
        document.getElementById("like_" + c_id).innerHTML = votes;
        document.getElementById("dislike_" + c_id).innerHTML = downvotes;
        var likedata = [];
        likedata.push(likes);
        likesend(likedata);
      });
    });

    function likesend(likedata){
      fetch('/userprofile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({likedata}),
      }).then((response) => response.json());
    }

  /////////////////////////// FOR DISLIKE /////////////////////////////////////

    var dislikebutton = document.querySelectorAll(".dec");

    dislikebutton.forEach(function(button) {
      button.addEventListener("click", function() {
        var dislikes = {
          userid : "",//userid of user
          add : "",//add that if user likes
          remove : "",//remove if user dislike
          likeremove : "",//remove that if downvote is present 
          upvote : 0,
          downvote : 0
        };
        
        let c_id = button.getAttribute("data-value1");
        let u_id = button.getAttribute("data-value4");
        let votes = button.getAttribute("data-value2");
        let upvotes = button.getAttribute("data-value6");
        let arr = button.getAttribute("data-value3").split(',');
        let like = button.getAttribute("data-value5").split(',');

        // find dislike button to corresponding c_id
        let likeButton = document.querySelector(`.inc[data-value1="${c_id}"]`);

        // if (!likeButton) {
        //   console.error("Dislike button not found!");
        //   // return;
        // }
        // else{
        //   console.log("found");
        // }
        // console.log("Initial arr : ", arr);
        // console.log("Initial likes arr : ", like);

        // Use indexOf instead of find to get the index
        let index = arr.indexOf(u_id); 
        // console.log("u_id:", u_id);
        // console.log("index:", index);

        if(index !== -1) {  // User has already disliked, so remove the dislike
          // console.log("decrease");
          votes--;
          if(votes<0)
            votes=0;
          arr.splice(index, 1); 
          dislikes.add = "";
          dislikes.remove = u_id;
        } else {  // User has not disliked, so add the dislike
          // console.log("increase");
          votes++;
          let ind = like.indexOf(u_id); 
          // console.log("index of like :", ind);
          if(ind !== -1){
            like.splice(ind, 1); 
            upvotes--;
            if(upvotes<0)
              upvotes=0;
            button.setAttribute("data-value5", like.join(',')); 
            button.setAttribute("data-value6", upvotes); 
            dislikes.likeremove=u_id;
          }
          arr.push(u_id); 
          dislikes.add = u_id;
          dislikes.remove = "";
        }

        // console.log("Updated arr:", arr); 
        // console.log("Updated like arr:", like); 

        button.setAttribute("data-value3", arr.join(',')); 
        button.setAttribute("data-value2", votes); 
        likeButton.setAttribute("data-value5", arr.join(','));
        likeButton.setAttribute("data-value6", votes);
        likeButton.setAttribute("data-value3", like.join(','));
        likeButton.setAttribute("data-value2", upvotes);

        dislikes.userid = c_id;
        dislikes.downvote = votes;
        dislikes.upvote=upvotes;
        document.getElementById("dislike_" + c_id).innerHTML = votes;
        document.getElementById("like_" + c_id).innerHTML = upvotes;
        let dislikedata = [];
        dislikedata.push(dislikes);
        send(dislikedata);
      });
    });

    function send(dislikedata){
      fetch('/userprofile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({dislikedata}),
      }).then((response) => response.json());
    }
  }


  // var tick1=document.querySelectorAll('#checkbox1');
  // console.log(tick1);
  // tick1.forEach(function(i){
  //   // console.log(i.value);
  //   var senddata=[];
  //   i.addEventListener('click', function() {
  //     senddata.push(i.getAttribute("data-value1"));
  //     senddata.push(i.getAttribute("data-value2"));
  //     sendData(senddata);
  //   });
  // })

  // var tick2=document.querySelectorAll('#checkbox2');
  // console.log(tick2);
  // tick2.forEach(function(i){
  //   // console.log(i.value);
  //   var senddata=[];
  //   i.addEventListener('click', function() {
  //     senddata.push(i.getAttribute("data-value1"));
  //     senddata.push(i.getAttribute("data-value2"));
  //     sendData(senddata);
  //   });
  // })

  // function sendData(formData) {
  //   console.log(formData);
  //   // Send data to the server using fetch API
  //   fetch('/adminprofile', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({formData}),
  //   })
  //   .then(data => {
  //       // console.log('Data sent successfully:', data);
  //   })
  //   .catch(error => {
  //       console.error('Error sending data to server:', error);
  //   });
  // }

  if(currentPage==='/userprofile' || currentPage==='/adminprofile'){
    const open=document.getElementsByClassName('number')[0].innerHTML;
    const inprogress=document.getElementsByClassName('number')[2].innerHTML;
    const close=document.getElementsByClassName('number')[1].innerHTML;

    // console.log(open,close,inprogress);

    const ctx = document.getElementById('myChart');

      new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [open,inprogress, close],
            backgroundColor: ['#FFA07A ', '#90EE90', '#87CEFA'],
            borderWidth: 1
          }]
        }
      });
    }

    if(currentPage==='/signup'){
      const signupForm = document.getElementById('signupform');
      // console.log(signupForm);
      if (signupForm) {
        signupForm.addEventListener('submit', function(event) {
          const password = document.getElementById('form3Example4c').value;
          const rpassword = document.getElementById('form3Example5c').value;
          const usernameError = document.getElementById('username-error');
          // console.log(password,rpassword);
        
          if (password!==rpassword) {
            // alert("Password must be same!");
            usernameError.style.display = 'block';
            event.preventDefault();
            return;
          }
          
        });
      }else {
        console.log("Signup form not found!");
      }
    }
});
  
