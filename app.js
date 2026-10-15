// Readify — app.js
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const books = [
  {
    id:"alice", title:"Alice's Adventures in Wonderland", author:"Lewis Carroll",
    years:"1865", minAge:6, genres:["Fantasy","Adventure","Classics"],
    cover:"https://covers.openlibrary.org/b/isbn/9780141439761-L.jpg",
    gutenberg:"https://www.gutenberg.org/ebooks/11",
    sample:[
      "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.",
      "Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”",
      "So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies."
    ]
  },
  {
    id:"oz", title:"The Wonderful Wizard of Oz", author:"L. Frank Baum",
    years:"1900", minAge:7, genres:["Fantasy","Adventure","Classics"],
    cover:"https://covers.openlibrary.org/b/isbn/9780141321004-L.jpg",
    gutenberg:"https://www.gutenberg.org/ebooks/55",
    sample:[
      "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.",
      "Their house was small, for the lumber to build it had to be carried by wagon many miles.",
      "There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds."
    ]
  },
  {
    id:"secret-garden", title:"The Secret Garden", author:"Frances Hodgson Burnett",
    years:"1911", minAge:7, genres:["Friendship","Family","Classics"],
    cover:"https://covers.openlibrary.org/b/isbn/9780064401883-L.jpg",
    gutenberg:"https://www.gutenberg.org/ebooks/113",
    sample:[
      "When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen.",
      "It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression.",
      "Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another."
    ]
  },
  {
    id:"anne", title:"Anne of Green Gables", author:"L. M. Montgomery",
    years:"1908", minAge:8, genres:["Friendship","Family","Classics"],
    cover:"https://covers.openlibrary.org/b/isbn/9780553213133-L.jpg",
    gutenberg:"https://www.gutenberg.org/ebooks/45",
    sample:[
      "Mrs. Rachel Lynde lived just where the Avonlea main road dipped down into a little hollow, fringed with alders and ladies' eardrops and traversed by a brook.",
      "The road was carpeted with grass and the woods were thick with firs and wild cherry trees.",
      "If Mrs. Rachel had looked from her window she would have seen a very pretty little country road."
    ]
  },
  {
    id:"little-women", title:"Little Women", author:"Louisa May Alcott",
    years:"1868", minAge:10, genres:["Family","Friendship","Classics"],
    cover:"https://covers.openlibrary.org/b/isbn/9780147514011-L.jpg",
    gutenberg:"https://www.gutenberg.org/ebooks/514",
    sample:[
      "Christmas won't be Christmas without any presents, grumbled Jo, lying on the rug.",
      "It's so dreadful to be poor! sighed Meg, looking down at her old dress.",
      "I don't think it's fair for some girls to have lots of pretty things, and other girls nothing at all."
    ]
  }
];

let firebaseReady = false;
let auth = null;
let db = null;
let currentUser = null;
let profile = {name:"Reader", age:10, genres:["Fantasy"], points:0};
let localDiscussions = [
  {name:"Readify Team", text:"Which story would you recommend to someone new to reading classics?", likes:3},
  {name:"Mia", text:"The Secret Garden has such a cosy atmosphere!", likes:6}
];
let activeBook = null, activePage = 0;

const $ = id => document.getElementById(id);
const toast = msg => {
  $("toast").textContent = msg;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2400);
};

function ageLabel(age){
  age = Number(age);
  if(age <= 6) return "6 or under";
  if(age <= 12) return "7–12";
  if(age <= 17) return "13–17";
  return "18+";
}
function canRead(book){
  return Number(profile.age || 18) >= book.minAge;
}

function renderBooks(){
  const genre = $("genreFilter").value;
  const age = $("ageFilter").value;
  const selectedAge = age === "all" ? Number(profile.age || 10) : Number(age);
  const visible = books.filter(book =>
    book.minAge <= selectedAge &&
    (genre === "all" || book.genres.includes(genre)) &&
    (age === "all" || book.minAge <= Number(age))
  );

  $("bookGrid").innerHTML = visible.map(book => `
    <article class="book-card">
      <div class="cover-wrap">
        <img src="${book.cover}" alt="Cover of ${book.title}" onerror="this.style.display='none';this.nextElementSibling.classList.remove('hidden')">
        <div class="image-placeholder hidden">Book cover placeholder</div>
      </div>
      <div class="book-meta">
        <h3>${book.title}</h3>
        <div class="author">${book.author} · ${book.years}</div>
        <div class="tags">${book.genres.map(g=>`<span class="tag">${g}</span>`).join("")}</div>
        <div class="age-note">Recommended for readers ${book.minAge}+</div>
        <div class="book-actions">
          <button class="btn btn-primary" data-read="${book.id}">Read sample</button>
          <a class="btn btn-outline" href="${book.gutenberg}" target="_blank" rel="noopener">Full book</a>
        </div>
      </div>
    </article>`).join("") || `<div class="discussion-card"><h3>No books match</h3><p>Try another genre or age range.</p></div>`;
}

function renderProfile(){
  $("profileName").textContent = profile.name || "Reader";
  $("profileEmail").textContent = currentUser?.email || "Local demo profile";
  $("profileAge").textContent = ageLabel(profile.age);
  $("profileAvatar").textContent = (profile.name || "R").trim().charAt(0).toUpperCase();
  $("profileNameInput").value = profile.name || "";
  $("profileAgeInput").value = String(profile.age || 10);
  [...$("profileGenresInput").options].forEach(o => o.selected = (profile.genres || []).includes(o.value));
  $("pointsTotal").textContent = profile.points || 0;
  $("levelText").textContent = `Level ${Math.floor((profile.points || 0)/100)+1}`;
  $("personalGreeting").textContent = `Hi ${profile.name || "Reader"} — your shelf is filtered for ${ageLabel(profile.age)}.`;
}

function renderDiscussions(){
  $("discussionList").innerHTML = localDiscussions.slice(-6).reverse().map(d=>`
    <div class="discussion-item"><strong>${d.name}</strong><p>${escapeHtml(d.text)}</p><span>♡ ${d.likes || 0}</span></div>
  `).join("");
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function navigate(page){
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
  document.querySelectorAll(".nav-link").forEach(n => n.classList.remove("active"));
  const target = $("page-"+page);
  if(target) target.classList.add("active-page");
  document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
  $("mainNav").classList.remove("open");
}

function openReader(bookId){
  const book = books.find(b=>b.id===bookId);
  if(!book) return;
  if(!canRead(book)){
    toast(`This book is hidden for your selected age group.`);
    return;
  }
  activeBook = book; activePage = 0;
  $("readerTitle").textContent = book.title;
  $("readerAuthor").textContent = book.author;
  $("gutenbergLink").href = book.gutenberg;
  $("readerModal").classList.remove("hidden");
  $("readerModal").setAttribute("aria-hidden","false");
  renderReader();
  addPoints(10);
}
function renderReader(){
  const pages = activeBook.sample;
  $("readerText").textContent = pages[activePage];
  $("pageNumber").textContent = `Sample page ${activePage+1} of ${pages.length}`;
  $("readerProgress").style.width = `${((activePage+1)/pages.length)*100}%`;
  $("prevPage").disabled = activePage === 0;
  $("nextPage").textContent = activePage === pages.length-1 ? "Finish sample ✓" : "Next page →";
}
function closeReader(){
  $("readerModal").classList.add("hidden");
  $("readerModal").setAttribute("aria-hidden","true");
}
async function addPoints(amount){
  profile.points = (profile.points || 0) + amount;
  renderProfile();
  if(firebaseReady && currentUser){
    await setDoc(doc(db,"users",currentUser.uid), {points:profile.points}, {merge:true}).catch(()=>{});
  } else localStorage.setItem("readifyProfile", JSON.stringify(profile));
}

async function saveProfile(e){
  e.preventDefault();
  profile.name = $("profileNameInput").value.trim() || "Reader";
  profile.age = Number($("profileAgeInput").value);
  profile.genres = [...$("profileGenresInput").selectedOptions].map(o=>o.value);
  renderProfile();
  renderBooks();
  if(firebaseReady && currentUser){
    await setDoc(doc(db,"users",currentUser.uid), {
      name:profile.name, age:profile.age, genres:profile.genres,
      points:profile.points || 0, updatedAt:serverTimestamp()
    }, {merge:true});
    $("firebaseStatus").textContent = "Saved to Firebase Firestore.";
  } else {
    localStorage.setItem("readifyProfile", JSON.stringify(profile));
    $("firebaseStatus").textContent = "Saved on this device. Add Firebase config for cloud storage.";
  }
  toast("Preferences saved!");
}

async function setupFirebase(){
  const placeholder = firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.projectId === "YOUR_PROJECT_ID";
  if(placeholder){
    $("firebaseStatus").textContent = "Demo mode: add your Firebase values to enable cloud accounts and database storage.";
    const saved = localStorage.getItem("readifyProfile");
    if(saved) profile = {...profile,...JSON.parse(saved)};
    renderProfile(); renderBooks(); return;
  }
  try{
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app); db = getFirestore(app); firebaseReady = true;
    onAuthStateChanged(auth, async user => {
      currentUser = user;
      if(user){
        const snap = await getDoc(doc(db,"users",user.uid));
        if(snap.exists()) profile = {...profile,...snap.data()};
        if(!profile.name || profile.name === "Reader") profile.name = user.displayName || "Reader";
        showApp();
      }else{
        showAuth();
      }
    });
    subscribeDiscussions();
  }catch(err){
    console.error(err);
    toast("Firebase could not be initialised. Running in demo mode.");
    renderProfile(); renderBooks();
  }
}

function showApp(){
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  renderProfile(); renderBooks(); renderDiscussions();
}
function showAuth(){
  $("authScreen").classList.remove("hidden");
  $("app").classList.add("hidden");
}
async function subscribeDiscussions(){
  if(!firebaseReady) return;
  const q = query(collection(db,"discussions"),orderBy("createdAt","desc"),limit(10));
  onSnapshot(q, snap => {
    localDiscussions = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderDiscussions();
  }, ()=>{});
}

$("genreFilter").addEventListener("change", renderBooks);
$("ageFilter").addEventListener("change", renderBooks);
document.addEventListener("click", async e => {
  const pageBtn = e.target.closest("[data-page]");
  if(pageBtn) navigate(pageBtn.dataset.page);
  const readBtn = e.target.closest("[data-read]");
  if(readBtn) openReader(readBtn.dataset.read);
  const scrollBtn = e.target.closest("[data-scroll]");
  if(scrollBtn) document.getElementById(scrollBtn.dataset.scroll)?.scrollIntoView({behavior:"smooth"});
});
$("mobileMenu").addEventListener("click",()=> $("mainNav").classList.toggle("open"));
$("closeReader").addEventListener("click",closeReader);
$("readerModal").addEventListener("click",e=>{if(e.target.id==="readerModal")closeReader()});
$("prevPage").addEventListener("click",()=>{if(activePage>0){activePage--;renderReader()}});
$("nextPage").addEventListener("click",()=>{if(activePage<activeBook.sample.length-1){activePage++;renderReader()}else closeReader()});

document.querySelectorAll(".auth-tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".auth-tab").forEach(t=>t.classList.remove("active"));
  tab.classList.add("active");
  $("loginForm").classList.toggle("hidden",tab.dataset.authTab!=="login");
  $("registerForm").classList.toggle("hidden",tab.dataset.authTab!=="register");
}));

$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!firebaseReady){toast("Add Firebase configuration to enable real login.");return;}
  try{await signInWithEmailAndPassword(auth,$("loginEmail").value,$("loginPassword").value);toast("Welcome back!")}
  catch(err){toast("Login failed. Check your email and password.");}
});

$("registerForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!firebaseReady){toast("Add Firebase configuration to create cloud accounts.");return;}
  try{
    const name=$("registerName").value.trim(), email=$("registerEmail").value;
    const age=Number($("registerAge").value);
    const genres=[...$("registerGenres").selectedOptions].map(o=>o.value);
    const cred=await createUserWithEmailAndPassword(auth,email,$("registerPassword").value);
    await updateProfile(cred.user,{displayName:name});
    profile={name,age,genres,points:0};
    await setDoc(doc(db,"users",cred.user.uid),{...profile,email,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    toast("Your Readify account is ready!");
  }catch(err){console.error(err);toast("Account creation failed. Check your details.");}
});

$("logoutBtn").addEventListener("click",async()=>{
  if(firebaseReady) await signOut(auth);
  else showAuth();
});
$("profileForm").addEventListener("submit",saveProfile);

$("discussionForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const text=$("discussionInput").value.trim(); if(!text)return;
  const item={name:profile.name || "Reader",text,likes:0};
  if(firebaseReady && currentUser){
    await addDoc(collection(db,"discussions"),{...item,userId:currentUser.uid,createdAt:serverTimestamp()});
  }else{
    localDiscussions.push(item); renderDiscussions();
  }
  $("discussionInput").value="";
  await addPoints(5);
  toast("Discussion posted — +5 points!");
});

document.querySelector(".brand-large")?.addEventListener("click",()=>{});
setupFirebase();
