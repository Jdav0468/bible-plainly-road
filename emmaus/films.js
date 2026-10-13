(function () {
  var BASE = "https://jdav0468.github.io/bible-plainly-road/emmaus/";
  var dock = document.getElementById("dock");
  if (!dock || document.getElementById("filmsPanel")) return;

  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("data-tab", "films");
  btn.textContent = "Films";
  dock.appendChild(btn);

  var panel = document.createElement("section");
  panel.id = "filmsPanel";
  panel.innerHTML =
    '<p class="films-kicker">Emmaus</p>' +
    '<h2 class="films-title">Know the story</h2>' +
    '<p class="films-lede">Nine short films on the Bible, Jesus, and the church. The line on the picture is the narration.</p>' +
    '<div id="filmsList"></div>' +
    '<div id="filmsStage" class="hidden"></div>';
  dock.parentNode.insertBefore(panel, dock);

  var films = [];
  var film = null;
  var scene = 0;
  var playing = false;
  var audio = document.createElement("audio");
  audio.id = "filmsVoice";
  audio.preload = "auto";
  document.body.appendChild(audio);

  function hidePanel() {
    document.body.classList.remove("tab-films");
    panel.style.display = "none";
    audio.pause();
    btn.classList.remove("on");
  }

  dock.addEventListener("click", function (event) {
    var pressed = event.target.closest("button");
    if (!pressed || pressed === btn) return;
    hidePanel();
  });

  btn.addEventListener("click", function (event) {
    event.stopPropagation();
    document.body.classList.add("tab-other", "tab-films");
    panel.style.display = "block";
    Array.prototype.forEach.call(dock.querySelectorAll("button"), function (other) {
      other.classList.toggle("on", other === btn);
    });
    window.scrollTo(0, 0);
    if (!films.length) load();
  });

  function load() {
    fetch(BASE + "films.json")
      .then(function (response) { return response.json(); })
      .then(function (data) {
        films = data.films || [];
        renderList();
      })
      .catch(function () {
        document.getElementById("filmsList").textContent = "The films could not be opened.";
      });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (char) {
      return { "&": "&", "<": "<", ">": ">", '"': """ }[char];
    });
  }

  function renderList() {
    audio.pause();
    playing = false;
    var stage = document.getElementById("filmsStage");
    var list = document.getElementById("filmsList");
    stage.classList.add("hidden");
    list.classList.remove("hidden");
    list.innerHTML = "";
    var last = "";
    films.forEach(function (item) {
      if (item.collection !== last) {
        last = item.collection;
        var shelf = document.createElement("p");
        shelf.className = "films-shelf";
        shelf.textContent = item.collection;
        list.appendChild(shelf);
      }
      var card = document.createElement("button");
      card.type = "button";
      card.className = "films-card";
      card.innerHTML = "<b>" + escapeHtml(item.number + "  " + item.title) + "</b><span>" + escapeHtml(item.summary) + "</span>";
      card.onclick = function () { openFilm(item); };
      list.appendChild(card);
    });
  }

  function spokenCues(parts) {
    var script = parts.filter(Boolean).map(function (part) {
      var text = String(part).trim();
      return /[.!?]$/.test(text) ? text : text + ".";
    }).join(" ");
    var sentences = script.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [script];
    var cues = [];
    sentences.forEach(function (raw) {
      var line = "";
      raw.trim().split(/\s+/).filter(Boolean).forEach(function (word) {
        var next = line ? line + " " + word : word;
        if (next.length > 42 && line) {
          cues.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) cues.push(line);
    });
    return cues.length ? cues : [script];
  }

  function cueAt(cues, progress) {
    var total = cues.reduce(function (sum, cue) { return sum + Math.max(cue.length, 1); }, 0);
    var target = Math.min(Math.max(progress, 0), 0.999) * total;
    var cursor = 0;
    for (var index = 0; index < cues.length; index += 1) {
      cursor += Math.max(cues[index].length, 1);
      if (cursor >= target) return cues[index];
    }
    return cues[cues.length - 1] || "";
  }

  function openFilm(item) {
    film = item;
    scene = 0;
    playing = false;
    document.getElementById("filmsList").classList.add("hidden");
    var stage = document.getElementById("filmsStage");
    stage.classList.remove("hidden");
    stage.innerHTML =
      '<button type="button" id="filmsBack" class="films-back">All films</button>' +
      '<p class="films-kicker" id="filmsKicker"></p>' +
      '<h2 class="films-title" id="filmsName"></h2>' +
      '<div class="films-frame"><img id="filmsStill" alt=""><p id="filmsCue" class="films-cue"></p></div>' +
      '<p id="filmsBody" class="films-body"></p>' +
      '<p id="filmsNote" class="films-note"></p>' +
      '<div class="films-controls"><button type="button" id="filmsPrev">Back</button><button type="button" id="filmsPlay">Play</button><button type="button" id="filmsNext">Next</button><span id="filmsCount"></span></div>';
    document.getElementById("filmsBack").onclick = renderList;
    document.getElementById("filmsPrev").onclick = function () { go(scene - 1); };
    document.getElementById("filmsNext").onclick = function () { go(scene + 1); };
    document.getElementById("filmsPlay").onclick = toggle;
    showScene();
  }

  function showScene() {
    var item = film.scenes[scene];
    document.getElementById("filmsKicker").textContent = item.kicker;
    document.getElementById("filmsName").textContent = item.title;
    document.getElementById("filmsBody").textContent = item.body;
    var note = document.getElementById("filmsNote");
    note.textContent = item.note || "";
    note.style.display = item.note ? "block" : "none";
    document.getElementById("filmsStill").src = BASE + "stills/" + item.still;
    document.getElementById("filmsCount").textContent = (scene + 1) + " / " + film.scenes.length;
    document.getElementById("filmsCue").textContent = cueAt(spokenCues([item.title, item.body, item.note]), 0);
    audio.src = BASE + "audio/" + item.audio;
    if (playing) audio.play().catch(function () { playing = false; syncPlay(); });
    syncPlay();
  }

  function syncPlay() {
    var play = document.getElementById("filmsPlay");
    if (play) play.textContent = playing && !audio.paused ? "Pause" : "Play";
  }

  function toggle() {
    if (!film) return;
    if (audio.paused) {
      playing = true;
      audio.play().then(syncPlay).catch(function () { playing = false; syncPlay(); });
    } else {
      playing = false;
      audio.pause();
      syncPlay();
    }
  }

  function go(index) {
    if (!film || index < 0) return;
    if (index >= film.scenes.length) {
      playing = false;
      audio.pause();
      document.getElementById("filmsCue").textContent = "End of the film.";
      syncPlay();
      return;
    }
    scene = index;
    showScene();
  }

  audio.addEventListener("timeupdate", function () {
    if (!film || !audio.duration) return;
    var line = document.getElementById("filmsCue");
    var item = film.scenes[scene];
    if (line && item) line.textContent = cueAt(spokenCues([item.title, item.body, item.note]), audio.currentTime / audio.duration);
  });

  audio.addEventListener("ended", function () {
    if (!film || scene >= film.scenes.length - 1) {
      playing = false;
      var line = document.getElementById("filmsCue");
      if (line) line.textContent = "End of the film.";
      syncPlay();
      return;
    }
    scene += 1;
    showScene();
  });
})();
