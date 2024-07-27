// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyALkurf5tgO7Yf-7vP94p0bCQz60hXwV_U",
    authDomain: "algomap2.firebaseapp.com",
    projectId: "algomap2",
    storageBucket: "algomap2.appspot.com",
    messagingSenderId: "1016175196464",
    appId: "1:1016175196464:web:7543b1c8560977f281f0f5",
    measurementId: "G-T3QWWZ3YR8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account'
});

let solvedQuestions = [];
let isInitialized = false;

function initApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            user.getIdToken().then(idToken => {
                fetch('/sessionLogin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ idToken })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.currentUser = user;
                        fetchSolvedQuestions().then(() => {
                            updateUI();
                            hideLoading();
                        });
                    } else {
                        console.error('Session login failed', data.error);
                        hideLoading();
                    }
                })
                .catch((error) => {
                    console.error('Session login failed', error);
                    hideLoading();
                });
            });
        } else {
            window.currentUser = null;
            updateUI();
            hideLoading();
        }
        isInitialized = true;
    });
}

function updateUI() {
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const userDetails = document.getElementById('user-details');
    
    if (window.currentUser) {
        signInBtn.style.display = 'none';
        signOutBtn.style.display = 'block';
        userDetails.innerHTML = `<h2>Hello, ${window.currentUser.displayName}!</h2>`;
        updateProgress();
    } else {
        signInBtn.style.display = 'block';
        signOutBtn.style.display = 'none';
        userDetails.innerHTML = '';
    }
}


function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
}


function signInWithGoogle() {
    // Delay the display of the message
    setTimeout(() => {
        const signInButton = document.getElementById('signInBtn');
        let messageSpan = document.getElementById('signInMessage');
        
        if (!messageSpan) {
            messageSpan = document.createElement('span');
            messageSpan.id = 'signInMessage';
            // messageSpan.textContent = 'If you signed in but nothing happened, please refresh the page...'; // Customize this text as needed
            signInButton.parentNode.insertBefore(messageSpan, signInButton.nextSibling);
        }
    }, 500); // Delay of 1000 milliseconds (1 second)

    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log("Google Auth User", user);

            const userId = user.uid;
            console.log("User ID:", userId);

        }).catch((error) => {
            console.error("Google Auth Error", error);
        });
}



function signOut() {
    auth.signOut().then(() => {
        fetch('/logout', { method: 'GET' })
            .then(() => {
                console.log("Signed Out");
                window.location.href = '/';
            })
            .catch((error) => {
                console.error("Sign Out Error", error);
            });
    }).catch((error) => {
        console.error("Sign Out Error", error);
    });
}

auth.onAuthStateChanged(user => {
    if (user) {
        user.getIdToken().then(idToken => {
            fetch('/sessionLogin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        if (!localStorage.getItem('refreshedPostLogin')) {
                            localStorage.setItem('refreshedPostLogin', 'true');
                            window.location.reload();
                            console.log('here')
                        }
                    } else {
                        console.error('Session login failed', data.error);
                    }
                })
                .catch((error) => {
                    console.error('Session login failed', error);
                });
        });
    } else {
        localStorage.removeItem('refreshedPostLogin');
    }
});


function toggleCheckmark(id, event) {
    if (!auth.currentUser) {
        return; // Do nothing if the user is not authenticated
    }

    var element = document.getElementById(id);
    var questionId = id.split('-').pop(); // Extract the leetcodeId from the element ID
    var action = element.innerHTML === '<span class="check">✔</span>' ? 'remove' : 'add';

    if (action === 'add') {
        element.innerHTML = '<span class="check">✔</span>';
        addSolvedQuestion(questionId);
        solvedQuestions.push(questionId); // Update local state
    } else {
        element.innerHTML = '<span class="x">✖</span>';
        removeSolvedQuestion(questionId);
        solvedQuestions = solvedQuestions.filter(id => id !== questionId); // Update local state
    }
    updateProgress();
}


function addSolvedQuestion(questionId) {
    fetch('/addSolvedQuestion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Question added successfully');
            } else {
                console.error('Failed to add solved question', data.error);
                document.getElementById(`checkmark-${questionId}`).innerHTML = '';
            }
        })
        .catch(error => {
            console.error('Error adding solved question:', error);
            document.getElementById(`checkmark-${questionId}`).innerHTML = '';
        });
}

function removeSolvedQuestion(questionId) {
    fetch('/removeSolvedQuestion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Question removed successfully');
            } else {
                console.error('Failed to remove solved question', data.error);
                document.getElementById(`checkmark-${questionId}`).innerHTML = '<span class="check">✔</span>';
            }
        })
        .catch(error => {
            console.error('Error removing solved question:', error);
            document.getElementById(`checkmark-${questionId}`).innerHTML = '<span class="check">✔</span>';
        });
}

function openModal(sectionName) {
    document.getElementById('modal-text').innerText = sectionName;

    const questions = window.sectionQuestions[sectionName] || [];
    const prerequisites = window.sectionPrerequisites[sectionName] || [];

    let table = "";
    table += "<table><tr><th>Problem</th><th>Difficulty</th><th>Solution</th><th>Code</th><th>Difficulty Score</th><th>Status</th></tr>";
    questions.forEach((question, index) => {
        let checkmarkId = `checkmark-${question.leetcodeId}`;
        let questionName = `<a href="${question.code}" target="_blank" class='problem-name'>${question.name}</a>`;
        let githubLink = question.leetcodeId !== "N/A" ? `<a href="${question.git}" target="_blank"><img src='/images/github.png' height='17px' style="margin-top: 10px" /></a>` : 'N/A';
        let rating = question.rating ? question.rating : 'N/A';
        let checkmark = solvedQuestions.includes(question.leetcodeId) ? '<span class="check">✔</span>' : '<span class="x">✖</span>';
        table += `<tr>
          <td>${questionName}</td>
          <td class="${'difficulty-' + question.difficulty.toLowerCase()}">${question.difficulty}</td>
          <td><a href="${question.longVideo}" target="_blank" class='video-link'>🎥</a></td>
          <td>${githubLink}</td>
          <td>${rating}</td>
          <td id="${checkmarkId}" onclick="toggleCheckmark('${checkmarkId}', event)" style="text-align:center; cursor:pointer;" onmouseover="showTooltip(event)" onmouseout="hideTooltip()">${checkmark}</td>
        </tr>`;
    });
    table += "</table>";

    let prerequisitesHtml = prerequisites.map(prerequisite => `<a href="${prerequisite.link}" target="_blank" class="prerequisite-box"><h4>${prerequisite.name}</h4></a>`).join("");

    // Calculate section progress directly
    const solvedSectionQuestions = questions.filter(question => solvedQuestions.includes(question.leetcodeId)).length;
    const totalSectionQuestions = questions.length;

    document.getElementById('modal-text').innerHTML = 
        `<h2>${sectionName}</h2>
         <div class="global-progress-text" id="modal-progress-text-${sectionName.replace(/\s+/g, '-')}" style="margin-bottom: 10px;">${solvedSectionQuestions} / ${totalSectionQuestions}</div>
         <div class="prerequisites-container" style="margin: 10px" >${prerequisitesHtml}</div>
         ${table}`;
    document.getElementById('modal').style.display = "block";
    document.body.style.overflow = 'hidden';

    const modalContent = document.querySelector('.modal-content');
    modalContent.scrollTop = 0;
    modalContent.scrollLeft = 0;
}




document.body.style.overflow = 'auto';

function closeModal() {
    document.getElementById('modal').style.display = "none";
    document.body.style.overflow = 'auto';
}

window.onclick = function(event) {
    let modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Define the function to fetch solved questions
function fetchSolvedQuestions() {
    return fetch('/getSolvedQuestions', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.questionsDone) {
            solvedQuestions = data.questionsDone;
            return solvedQuestions;
        } else {
            console.error('Failed to retrieve solved questions');
            return [];
        }
    })
    .catch(error => {
        console.error('Error retrieving solved questions:', error);
        return [];
    });
}

function showTooltip(event) {
    if (auth.currentUser) return; // Only show tooltip if user is not authenticated
    const tooltip = document.getElementById('tooltip');
    const modalContent = document.querySelector('.modal-content');
    const tooltipHeight = tooltip.offsetHeight;
    const tooltipWidth = tooltip.offsetWidth;
    const modalRect = modalContent.getBoundingClientRect();
    
    let tooltipX = event.clientX - modalRect.left;
    let tooltipY = event.clientY - modalRect.top;
    
    // Adjust X position if tooltip goes off screen
    if (tooltipX + tooltipWidth > modalRect.width) {
        tooltipX = modalRect.width - tooltipWidth - 10; // 10px padding
    }
    
    // Adjust Y position if tooltip goes off screen
    if (tooltipY + tooltipHeight > modalRect.height) {
        tooltipY = modalRect.height - tooltipHeight - 10; // 10px padding
    }

    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    tooltip.style.display = 'block';
}

// Function to hide tooltip
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

// Function to update progress bars
function updateProgress() {
    let totalSolvedQuestions = 0;
    let totalQuestions = 0;

    for (const section in window.sectionQuestions) {
        const sectionQuestions = window.sectionQuestions[section];
        const totalSectionQuestions = sectionQuestions.length;
        const solvedSectionQuestions = sectionQuestions.filter(q => solvedQuestions.includes(q.leetcodeId)).length;

        totalSolvedQuestions += solvedSectionQuestions;
        totalQuestions += totalSectionQuestions;

        const progressPercentage = (solvedSectionQuestions / totalSectionQuestions) * 100;
        const progressBar = document.getElementById(`progress-bar-${section.replace(/\s+/g, '-')}`);
        const progressText = document.getElementById(`progress-text-${section.replace(/\s+/g, '-')}`);
        const modalProgressBar = document.getElementById(`modal-progress-bar-${section.replace(/\s+/g, '-')}`);
        const modalProgressText = document.getElementById(`modal-progress-text-${section.replace(/\s+/g, '-')}`);

        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
        }
        if (progressText) {
            progressText.innerText = `${solvedSectionQuestions} / ${totalSectionQuestions}`;
        }
        if (modalProgressBar) {
            modalProgressBar.style.width = `${progressPercentage}%`;
        }
        if (modalProgressText) {
            modalProgressText.innerText = `${solvedSectionQuestions} / ${totalSectionQuestions}`;
        }
    }

    const globalProgressPercentage = (totalSolvedQuestions / totalQuestions) * 100;
    const globalProgressBar = document.getElementById('global-progress-bar');
    const globalProgressText = document.getElementById('global-progress-text');

    if (globalProgressBar) {
        globalProgressBar.style.width = `${globalProgressPercentage}%`;
    }
    if (globalProgressText) {
        globalProgressText.innerText = `${totalSolvedQuestions} / ${totalQuestions}`;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initApp();
});




