import React, {useEffect, useRef, useState} from "react";
import "./app.css";

const TOTAL_KEYS = 61;
const NOTE_SEQUENCE = [
    "C",
    "Cb",
    "D",
    "Db",
    "E",
    "F",
    "Fb",
    "G",
    "Gb",
    "A",
    "Ab",
    "B"
];

function generateNotes() {
    const notes = [];
    let octave = 2;
    let index = 0;
    for (let i = 0; i < TOTAL_KEYS; i++) {
        notes.push(NOTE_SEQUENCE[index] + octave);
        index++;
        if (index === 12) {
            index = 0;
            octave++;
        }
    }
    return notes;
}

const ALL_NOTES = generateNotes();
const isBlack = (n) => n.includes("b");

// ===== Piano Samples =====
const audioMap = {};
ALL_NOTES.forEach(note => {
    audioMap[note] = new Audio(`piano/${note}.mp3`);
});

function playSound(note) {
    const audio = audioMap[note];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
}

export default function App() {
    const [songs, setSongs] = useState([]);
    const [selectedSong, setSelectedSong] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [tempo, setTempo] = useState(1);

    const timerRef = useRef(null);

    useEffect(() => {
        const context = require.context("../public/songs", false, /\.json$/);
        const list = context.keys().map((key) => {
            const cleanName = key.replace("./", "").replace(".json", "");
            return {
                name: cleanName,
                file: "songs/" + key.replace("./", "")
            };
        });

        setSongs(list);
    }, []);

    const loadSong = async (file) => {
        const res = await fetch(file);
        const data = await res.json();
        setSelectedSong(data);
        setCurrentIndex(0);
        setIsPlaying(false);
        clearTimeout(timerRef.current);
    };

    const play = () => {
        if (!selectedSong) return;
        setIsPlaying(true);
    };

    const pause = () => {
        setIsPlaying(false);
        clearTimeout(timerRef.current);
    };

    const stop = () => {
        setIsPlaying(false);
        setCurrentIndex(0);
        clearTimeout(timerRef.current);
    };

    useEffect(() => {
        if (!isPlaying || !selectedSong) return;

        if (currentIndex >= selectedSong.notes.length) {
            setIsPlaying(false);
            return;
        }

        const item = selectedSong.notes[currentIndex];

        if (item.right) playSound(item.right);
        if (item.left) playSound(item.left);

        const duration = (item.duration || 600) / tempo;

        timerRef.current = setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
        }, duration);

        return () => clearTimeout(timerRef.current);
    }, [
        isPlaying,
        currentIndex,
        selectedSong,
        tempo
    ]);

    const activeRight = selectedSong?.notes[currentIndex]?.right;
    const activeLeft = selectedSong?.notes[currentIndex]?.left;

    return (
        <div className="container">
            <h1 style={{textAlign: "center", marginTop: "10px"}}>
                Piano 61 Keys - Left / Right Hand
            </h1>

            {selectedSong && (
                <h2 style={{textAlign: "center", marginTop: "10px"}}>
                    🎵 {isPlaying ? "Đang phát: " : "Đã dừng: "}
                    {selectedSong.title}
                </h2>
            )}

            <div className="controls">
                <select onChange={(e) => loadSong(e.target.value)}>
                    <option value="">Chọn bài</option>
                    {songs.map(s => (
                        <option key={s.file} value={s.file}>
                            {s.name}
                        </option>
                    ))}
                </select>

                {!isPlaying ? (
                    <button onClick={play}>Play</button>
                ) : (
                    <button onClick={pause}>Pause</button>
                )}

                <button onClick={stop}>Stop</button>

                <label>Tempo</label>
                <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={tempo}
                    onChange={(e) => setTempo(parseFloat(e.target.value))}
                />
            </div>

            <div className="piano">
                {ALL_NOTES.map((note) => {
                    if (isBlack(note)) return null;
                    const active = note === activeRight || note === activeLeft;
                    const handClass =
                        note === activeRight
                            ? "right-hand"
                            : note === activeLeft
                                ? "left-hand"
                                : "";

                    return (
                        <div
                            key={note}
                            className={`white-key ${active ? "active-white" : ""} ${handClass}`}
                            onClick={() => playSound(note)}
                        >
                            {note}
                        </div>
                    );
                })}

                {ALL_NOTES.map((note, idx) => {
                    if (!isBlack(note)) return null;
                    const active = note === activeRight || note === activeLeft;
                    const handClass =
                        note === activeRight
                            ? "right-hand"
                            : note === activeLeft
                                ? "left-hand"
                                : "";

                    const whiteIndex = ALL_NOTES.slice(0, idx).filter(n => !isBlack(n)).length;

                    return (
                        <div
                            key={note}
                            className={`black-key ${active ? "active-black" : ""} ${handClass}`}
                            style={{left: whiteIndex * 40 - 12}}
                            onClick={() => playSound(note)}
                        >
                            {note}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
