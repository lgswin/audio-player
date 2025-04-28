import React, { useState, useEffect, useRef } from "react";
import "./index.css";

import { PageTemplate } from "./components/PageTemplate";
import { TagsTemplate } from "./components/TagsTemplate";
import { TagItem } from "./components/TagItem";
import { Search } from "./components/Search";
import { PlayerTemplate } from "./components/PlayerTemplate";
import { TitleAndTimeBox } from "./components/TitleAndTimeBox";
import { Title } from "./components/Title";
import { Time } from "./components/Time";
import { Progress } from "./components/Progress";
import { ButtonsAndVolumeBox } from "./components/ButtonsAndVolumeBox";
import { ButtonsBox } from "./components/ButtonsBox";
import { Loop } from "./components/Loop";
import { Previous } from "./components/Previous";
import { Play } from "./components/Play";
import { Pause } from "./components/Pause";
import { Next } from "./components/Next";
import { Shuffle } from "./components/Shuffle";
import { Volume } from "./components/Volume";
import { PlaylistTemplate } from "./components/PlaylistTemplate";
import { PlaylistItem } from "./components/PlaylistItem";

import loopCurrentBtn from "./icons/loop_current.png";
import loopNoneBtn from "./icons/loop_none.png";
import previousBtn from "./icons/previous.png";
import playBtn from "./icons/play.png";
import pauseBtn from "./icons/pause.png";
import nextBtn from "./icons/next.png";
import shuffleAllBtn from "./icons/shuffle_all.png";
import shuffleNoneBtn from "./icons/shuffle_none.png";

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedHours = hours > 0 ? hours.toString() + ":" : "";
  const formattedMinutes =
    minutes < 10 && hours > 0
      ? "0" + minutes.toString() + ":"
      : minutes.toString() + ":";
  const formattedSeconds =
    remainingSeconds < 10
      ? "0" + remainingSeconds.toString()
      : remainingSeconds.toString();

  return formattedHours + formattedMinutes + formattedSeconds;
};

const tracks = [
  {
    url: "https://audioplayer.madza.dev/Madza-Chords_of_Life.mp3",
    title: "Madza - Chords of Life",
    tags: ["house"],
  },
  {
    url: "https://audioplayer.madza.dev/Madza-Late_Night_Drive.mp3",
    title: "Madza - Late Night Drive",
    tags: ["dnb"],
  },
  {
    url: "https://audioplayer.madza.dev/Madza-Persistence.mp3",
    title: "Madza - Persistence",
    tags: ["dubstep"],
  },
];

const Player = ({
  trackList = tracks,
  includeTags = true,
  includeSearch = true,
  showPlaylist = true,
  sortTracks = true,
  autoPlayNextTrack = true,
  customColorScheme = {},
}) => {
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [title, setTitle] = useState("");
  const [length, setLength] = useState(0);
  const [time, setTime] = useState(0);
  const [slider, setSlider] = useState(1);
  const [buffer, setBuffer] = useState(0);
  const [drag, setDrag] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffled, setShuffled] = useState(false);
  const [looped, setLooped] = useState(false);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);

  let playlist = [];
  const [filter, setFilter] = useState([]);
  let [curTrack, setCurTrack] = useState(0);
  const [query, updateQuery] = useState("");

  const tags = [];
  trackList.forEach((track) => {
    track.tags.forEach((tag) => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });
  });

  useEffect(() => {
    if (trackList.length === 0) {
      setAudio(null);
      setTitle("");
      setLength(0);
      setTime(0);
      setSlider(1);
      setBuffer(0);
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(trackList[curTrack].url);
    audio.load();

    const setAudioData = () => {
      setLength(audio.duration);
      setTime(audio.currentTime);
    };

    const setAudioTime = () => {
      const curTime = audio.currentTime;
      setTime(curTime);
      setSlider(curTime ? ((curTime * 100) / audio.duration).toFixed(1) : 0);
    };

    const setAudioProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedPercentage =
          (audio.buffered.end(0) / audio.duration) * 100;
        setBuffer(bufferedPercentage.toFixed(2));
      }
    };

    const setAudioVolume = () => setVolume(audio.volume);
    const setAudioEnd = () => setHasEnded(!hasEnded);

    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("progress", setAudioProgress);
    audio.addEventListener("volumechange", setAudioVolume);
    audio.addEventListener("ended", setAudioEnd);

    setAudio(audio);
    setTitle(trackList[curTrack].title);

    for (const [variable, value] of Object.entries(customColorScheme)) {
      document.documentElement.style.setProperty(`--${variable}`, value);
    }

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("progress", setAudioProgress);
      audio.removeEventListener("volumechange", setAudioVolume);
      audio.removeEventListener("ended", setAudioEnd);
      audio.pause();
      audio.src = "";
    };
  }, [curTrack, trackList]);

  useEffect(() => {
    if (audio) {
      audio.src = trackList[curTrack].url;
      audio.load();

      audio.oncanplay = () => {
        setTitle(trackList[curTrack].title);
        play();
      };

      const setAudioEnd = () => {
        setHasEnded(!hasEnded);
      };
      audio.addEventListener("ended", setAudioEnd);

      return () => {
        audio.removeEventListener("ended", setAudioEnd);
      };
    }
  }, [curTrack]);

  useEffect(() => {
    if (audio) {
      if (shuffled) {
        playlist = shufflePlaylist(playlist);
      }
      if (looped) {
        play();
      } else if (autoPlayNextTrack && !looped) {
        next();
      } else {
        setIsPlaying(false);
      }
    }
  }, [hasEnded]);

  useEffect(() => {
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audio) {
      pause();
      const val = Math.round((drag * audio.duration) / 100);
      const bufferedRanges = audio.buffered;

      let isInBufferedRange = false;
      for (let i = 0; i < bufferedRanges.length; i++) {
        if (val >= bufferedRanges.start(i) && val <= bufferedRanges.end(i)) {
          isInBufferedRange = true;
          break;
        }
      }

      if (isInBufferedRange) {
        audio.currentTime = val;
      } else {
        const waitingHandler = () => {
          if (audio.readyState === 4) {
            audio.removeEventListener("waiting", waitingHandler);
            // console.log("waiting for data");
          }
        };
        audio.addEventListener("waiting", waitingHandler);
      }
    }
  }, [drag]);

  useEffect(() => {
    if (audio) {
      let setAudioEnd;

      if (looped) {
        setAudioEnd = () => {
          audio.currentTime = 0;
          play();
        };
      } else {
        setAudioEnd = () => {
          setHasEnded(!hasEnded);
        };
      }

      audio.addEventListener("ended", setAudioEnd);

      return () => {
        audio.removeEventListener("ended", setAudioEnd);
      };
    }
  }, [looped]);

  useEffect(() => {
    if (!playlist.includes(curTrack)) {
      setCurTrack((curTrack = playlist[0]));
    }
  }, [filter]);

  //  Handle functions

  const loop = () => {
    setLooped(!looped);
  };

  const previous = () => {
    const index = playlist.indexOf(curTrack);
    index !== 0
      ? setCurTrack((curTrack = playlist[index - 1]))
      : setCurTrack((curTrack = playlist[playlist.length - 1]));
  };

  const stopOtherAudio = async () => {
    try {
      // Create a short silent audio element
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      
      // Try to play and immediately pause to stop other audio
      await silentAudio.play();
      silentAudio.pause();
      
      // Also try to use AudioContext as a backup method
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Create a short silent buffer
      const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      source.stop(audioContextRef.current.currentTime + 0.1);
      
      // Force audio context to start
      await audioContextRef.current.resume();
    } catch (error) {
      console.error('Error stopping other audio:', error);
    }
  };

  const play = () => {
    setIsPlaying(true);
    audio.play();
  };

  const pause = () => {
    setIsPlaying(false);
    audio.pause();
  };

  const next = () => {
    const index = playlist.indexOf(curTrack);
    index !== playlist.length - 1
      ? setCurTrack((curTrack = playlist[index + 1]))
      : setCurTrack((curTrack = playlist[0]));
  };

  const shuffle = () => {
    setShuffled(!shuffled);
  };

  const shufflePlaylist = (arr) => {
    if (arr.length === 1) return arr;
    const rand = Math.floor(Math.random() * arr.length);
    return [arr[rand], ...shufflePlaylist(arr.filter((_, i) => i !== rand))];
  };

  const sortCompare = (a, b) =>
    !sortTracks ? null : a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1;

  const tagClickHandler = (e) => {
    const tag = e.currentTarget.innerHTML;
    if (!filter.includes(tag)) {
      setFilter([...filter, tag]);
    } else {
      const filteredArray = filter.filter((item) => item !== tag);
      setFilter([...filteredArray]);
    }
  };

  const playlistItemClickHandler = (e) => {
    const num = Number(e.currentTarget.getAttribute("data-key"));
    const index = playlist.indexOf(num);
    setCurTrack((curTrack = playlist[index]));
    play();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const newTrack = {
        url: fileUrl,
        title: file.name,
        tags: ["local"],
      };
      
      // Add the new track to the beginning of the trackList
      trackList.unshift(newTrack);
      setCurTrack(0);
      
      // Update audio source
      if (audio) {
        audio.src = fileUrl;
        audio.load();
        setTitle(file.name);
        // Remove auto play
        setIsPlaying(false);
      }
    }
  };

  return (
    <PageTemplate>
      {includeTags && trackList.length > 0 && (
        <TagsTemplate>
          {tags.map((tag, index) => {
            return (
              <TagItem
                key={index}
                status={
                  filter.length !== 0 && filter.includes(tag) ? "active" : ""
                }
                tag={tag}
                onClick={tagClickHandler}
              />
            );
          })}
        </TagsTemplate>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        {includeSearch && trackList.length > 0 && (
          <Search
            value={query}
            onChange={(e) => updateQuery(e.target.value.toLowerCase())}
            placeholder={`Search ${trackList.length} tracks...`}
          />
        )}
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2c5282",
            color: "white",
            border: "2px solid #2c5282",
            borderRadius: "5px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            whiteSpace: "nowrap",
            ":hover": {
              backgroundColor: "transparent",
              color: "#2c5282"
            }
          }}
        >
          Load Local Audio File
        </button>
      </div>
      {trackList.length > 0 ? (
        <PlayerTemplate>
          <TitleAndTimeBox>
            <Title title={title} />
            <Time
              time={`${!time ? "0:00" : formatTime(time)}/${
                !length ? "0:00" : formatTime(length)
              }`}
            />
          </TitleAndTimeBox>
          <Progress
            value={slider}
            progress={buffer}
            onChange={(e) => {
              setSlider(e.target.value);
              setDrag(e.target.value);
            }}
            onMouseUp={play}
            onTouchEnd={play}
          />
          <ButtonsAndVolumeBox>
            <ButtonsBox>
              <Loop src={looped ? loopCurrentBtn : loopNoneBtn} onClick={loop} />
              <Previous src={previousBtn} onClick={previous} />
              {isPlaying ? (
                <Pause src={pauseBtn} onClick={pause} />
              ) : (
                <Play src={playBtn} onClick={play} />
              )}
              <Next src={nextBtn} onClick={next} />
              <Shuffle
                src={shuffled ? shuffleAllBtn : shuffleNoneBtn}
                onClick={shuffle}
              />
            </ButtonsBox>
            <Volume
              value={volume}
              onChange={(e) => {
                setVolume(e.target.value / 100);
              }}
            />
          </ButtonsAndVolumeBox>
        </PlayerTemplate>
      ) : (
        <div style={{ 
          textAlign: "center", 
          padding: "20px", 
          color: "var(--titleColor)",
          fontSize: "1.2em" 
        }}>
          No tracks loaded. Please load an audio file to start playing.
        </div>
      )}
      <PlaylistTemplate visibility={showPlaylist}>
        {trackList.sort(sortCompare).map((el, index) => {
          if (
            filter.length === 0 ||
            filter.some((filter) => el.tags.includes(filter))
          ) {
            if (el.title.toLowerCase().includes(query.toLowerCase())) {
              playlist.push(index);
              return (
                <PlaylistItem
                  status={curTrack === index ? "active" : ""}
                  key={index}
                  data_key={index}
                  title={el.title}
                  src={el.url}
                  onClick={playlistItemClickHandler}
                />
              );
            }
          }
        })}
      </PlaylistTemplate>
    </PageTemplate>
  );
};

export default Player;
