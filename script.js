const content = document.getElementById("content");
const postsCollection = firebase.firestore().collection("posts");

function getUserId() {
  if (!localStorage.getItem("userId")) {
    localStorage.setItem("userId", "user_" + Math.random().toString(36).substr(2, 9));
  }
  return localStorage.getItem("userId");
}

async function showHome() {
  const sort = document.getElementById("sort")?.value || "new";
  let html = `
    <h2>投稿一覧</h2>
    <div>
      <label for="sort">並び替え:</label>
      <select id="sort" onchange="showHome()">
        <option value="new">新着順</option>
        <option value="popular">人気順</option>
      </select>
    </div>
  `;

  const snapshot = await postsCollection.get();
  let posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (sort === "popular") {
    posts.sort((a, b) => b.likes.length - a.likes.length);
  } else {
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  posts.forEach((post, i) => {
    html += `
      <div class="post">
        <p><strong>${post.name || "匿名"}</strong> (${new Date(post.date).toLocaleString()})</p>
        <p>${post.text}</p>
        ${post.image ? `<img src="${post.image}" alt="投稿画像">` : ""}
        <button class="like-button" onclick="likePost('${post.id}')">いいね (${post.likes.length})</button>
        <button onclick="sharePost('${post.id}', '${post.text}')">シェア</button>
        <div class="comment">
          ${post.comments.map(c => `<p>💬 ${c}</p>`).join("")}
          <input type="text" placeholder="コメントする" onkeypress="if(event.key==='Enter'){addComment('${post.id}', this)}">
        </div>
      </div>
    `;
  });

  content.innerHTML = html;
}

function showPostForm() {
  content.innerHTML = `
    <h2>やさしさ投稿フォーム</h2>
    <form onsubmit="submitPost(event)">
      <input type="text" id="name" placeholder="ニックネーム（任意）"><br><br>
      <textarea id="text" rows="4" placeholder="やさしい出来事を書いてください" maxlength="280" oninput="countChars()"></textarea>
      <div id="char-count">0/280文字</div><br>
      <input type="file" id="imageInput" accept="image/*"><br><br>
      <button type="submit">投稿する</button>
    </form>
  `;
}

function countChars() {
  const text = document.getElementById("text").value;
  document.getElementById("char-count").innerText = `${text.length}/280文字`;
}

function submitPost(e) {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const text = document.getElementById("text").value;
  const imageInput = document.getElementById("imageInput");
  const reader = new FileReader();

  reader.onload = async function () {
    const image = imageInput.files[0] ? reader.result : null;
    const post = {
      name,
      text,
      image,
      date: new Date().toISOString(),
      userId: getUserId(),
      likes: [],
      comments: []
    };
    await postsCollection.add(post);
    showHome();
  };

  if (imageInput.files[0]) {
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    reader.onload();
  }
}

async function likePost(postId) {
  const userId = getUserId();
  const doc = await postsCollection.doc(postId).get();
  const post = doc.data();
  if (!post.likes.includes(userId)) {
    post.likes.push(userId);
    await postsCollection.doc(postId).update({ likes: post.likes });
    alert("あなたのいいねが届きました！");
    showHome();
  }
}

async function addComment(postId, input) {
  const comment = input.value.trim();
  if (comment) {
    const doc = await postsCollection.doc(postId).get();
    const post = doc.data();
    post.comments.push(comment);
    await postsCollection.doc(postId).update({ comments: post.comments });
    showHome();
  }
}

async function showMyPage() {
  const userId = getUserId();
  const snapshot = await postsCollection.where("userId", "==", userId).get();
  const posts = snapshot.docs.map(doc => doc.data());

  let html = `<h2>マイページ</h2>`;
  if (posts.length === 0) {
    html += "<p>まだ投稿がありません。</p>";
  } else {
    posts.forEach(p => {
      html += `
        <div class="post">
          <p><strong>${p.name || "匿名"}</strong> (${new Date(p.date).toLocaleString()})</p>
          <p>${p.text}</p>
          ${p.image ? `<img src="${p.image}" alt="投稿画像">` : ""}
          <p>❤️ ${p.likes.length} いいね</p>
        </div>
      `;
    });
  }
  content.innerHTML = html;
}

async function showRanking() {
  const snapshot = await postsCollection.get();
  const posts = snapshot.docs.map(doc => doc.data());
  const sorted = posts.sort((a, b) => b.likes.length - a.likes.length).slice(0, 5);
  let html = `<h2>ランキング（いいね数順）</h2>`;
  sorted.forEach(p => {
    html += `
      <div class="post">
        <p><strong>${p.name || "匿名"}</strong> (${new Date(p.date).toLocaleString()})</p>
        <p>${p.text}</p>
        ${p.image ? `<img src="${p.image}" alt="投稿画像">` : ""}
        <p>❤️ ${p.likes.length} いいね</p>
      </div>
    `;
  });
  content.innerHTML = html;
}

function sharePost(id, text) {
  const tweet = `${text} - #やさしさ日記`;
  const url = encodeURIComponent("https://example.com");
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${url}`;
  window.open(shareUrl, "_blank");
}

// 初期表示
showHome();
