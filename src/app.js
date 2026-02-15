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
    audioMap[note] = new Audio(`${process.env.PUBLIC_URL}/piano/${note}.mp3`);
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
    const [isCounting, setIsCounting] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [countdownStart, setCountdownStart] = useState(null);
    const [tempo, setTempo] = useState(0.5);
    const [songStartTime, setSongStartTime] = useState(null);
    const [pauseTimeOffset, setPauseTimeOffset] = useState(0);
    const [currentTime, setCurrentTime] = useState(Date.now());

    const timerRef = useRef(null);
    const containerRef = useRef(null);
    const requestRef = useRef(null);

    const animate = (time) => {
        setCurrentTime(Date.now());
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (isPlaying || isCounting) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [
        isPlaying,
        isCounting
    ]);

    useEffect(() => {
        const context = require.context("../public/songs", false, /\.json$/);
        const list = context.keys().map((key) => {
            const cleanName = key.replace("./", "").replace(".json", "");
            return {
                name: cleanName,
                file: process.env.PUBLIC_URL + "/songs/" + key.replace("./", "")
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
        if (currentIndex === 0) {
            setIsCounting(true);
            setCountdown(3);
            setCountdownStart(Date.now());
            let count = 3;
            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    setCountdown(count);
                } else {
                    clearInterval(interval);
                    setIsCounting(false);
                    setCountdownStart(null);
                    setIsPlaying(true);
                    setHasStarted(true);
                    setSongStartTime(Date.now());
                    setPauseTimeOffset(0);
                }
            }, 1000);
        } else {
            setIsPlaying(true);
            setSongStartTime(Date.now());
        }
    };

    const pause = () => {
        setIsPlaying(false);
        setIsCounting(false);
        setCountdownStart(null);
        if (songStartTime) {
            setPauseTimeOffset(prev => prev + (Date.now() - songStartTime));
        }
        setSongStartTime(null);
        clearTimeout(timerRef.current);
    };

    const stop = () => {
        setIsPlaying(false);
        setIsCounting(false);
        setHasStarted(false);
        setCountdownStart(null);
        setCurrentIndex(0);
        setSongStartTime(null);
        setPauseTimeOffset(0);
        clearTimeout(timerRef.current);
    };

    const getNoteX = (note) => {
        const idx = ALL_NOTES.indexOf(note);
        if (idx === -1) return 0;
        if (isBlack(note)) {
            const whiteIndex = ALL_NOTES.slice(0, idx).filter(n => !isBlack(n)).length;
            return whiteIndex * 40 - 12;
        } else {
            const whiteIndex = ALL_NOTES.slice(0, idx).filter(n => !isBlack(n)).length;
            return whiteIndex * 40;
        }
    };


    useEffect(() => {
        if (!isPlaying || !selectedSong) return;

        if (currentIndex >= selectedSong.notes.length) {
            stop();
            return;
        }

        const item = selectedSong.notes[currentIndex];

        if (item.right) playSound(item.right);
        if (item.left) playSound(item.left);

        const duration = (item.duration || 600) / tempo;

        timerRef.current = setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
        }, duration);

        return () => {
            clearTimeout(timerRef.current);
        };
    }, [
        isPlaying,
        currentIndex,
        selectedSong,
        tempo
    ]);

    const activeRight = selectedSong?.notes[currentIndex]?.right;
    const activeLeft = selectedSong?.notes[currentIndex]?.left;

    const TRAVEL_TIME = 3000; // 3 seconds to travel
    const TRAVEL_DISTANCE = 440; // 300px container + 140px key height
    const ADDITIONAL_DELAY = 3800; // Tăng lên 3.5s delay như yêu cầu

    const upcomingNotes = [];
    if (selectedSong) {
        // Tính toán thời điểm hiện tại của bài hát dựa trên songStartTime và offset
        let songElapsed = pauseTimeOffset + ((isPlaying && songStartTime) ? (currentTime - songStartTime) : 0);

        // Nếu đang đếm ngược, songElapsed sẽ âm (từ -3000ms về 0ms)
        if (isCounting && countdownStart) {
            songElapsed = (currentTime - countdownStart) - 3000;
        }

        // Tính tổng thời gian tích lũy của các nốt để biết nốt nào nên phát lúc nào
        let accumulatedTime = 0;
        let order = 0;

        for (let i = 0; i < selectedSong.notes.length; i++) {
            const noteData = selectedSong.notes[i];
            const duration = (noteData.duration || 600) / tempo;

            // Delay từ thời điểm hiện tại của bài hát đến khi nốt này bắt đầu phát
            const delayToStart = accumulatedTime - songElapsed;

            // Nốt đang phát (active) là nốt mà thời gian hiện tại nằm trong khoảng duration của nó
            const isActive = songElapsed >= accumulatedTime && songElapsed < (accumulatedTime + duration);

            // Chỉ quan tâm đến các nốt sắp tới hoặc nốt đang phát
            if (delayToStart + duration > -100) {
                const isWhite = !isBlack(noteData.right || noteData.left || "");
                const height = isWhite ? 140 : 70;

                // Re-implement logic order:
                let noteOrder = 0;
                if (songElapsed < accumulatedTime) {
                    // Nốt tương lai
                    noteOrder = i - currentIndex;
                    // Đảm bảo currentIndex luôn trỏ tới nốt đang phát hoặc nốt sắp tới gần nhất
                } else if (isActive) {
                    noteOrder = 0;
                } else {
                    // Nốt quá khứ (đang biến mất dần)
                    noteOrder = 0;
                }

                if (noteOrder >= 0 && noteOrder <= 4) {
                    if (noteData.right) {
                        upcomingNotes.push({
                            note: noteData.right,
                            delay: delayToStart,
                            duration,
                            height,
                            key: `r-${i}`,
                            order: noteOrder
                        });
                    }
                    if (noteData.left) {
                        upcomingNotes.push({
                            note: noteData.left,
                            delay: delayToStart,
                            duration,
                            height,
                            key: `l-${i}`,
                            order: noteOrder
                        });
                    }
                }
            }

            accumulatedTime += duration;
            if (i - currentIndex > 10) break; // Tối ưu vòng lặp
        }
    }

    const getNoteColor = (un) => {
        const isB = isBlack(un.note);
        if (un.delay <= 0) return isB ? "#ff4d4f" : "#fadb14";

        // Càng xa (order lớn) thì càng nhạt và mờ
        const factor = Math.max(0.2, 1 - un.order * 0.2);
        if (isB) {
            // Sắc độ đỏ nhạt dần
            return `rgba(248, 113, 113, ${factor})`;
        } else {
            // Sắc độ vàng nhạt dần
            return `rgba(253, 224, 71, ${factor})`;
        }
    };

    return (
        <div className="container">
            <h1 style={{textAlign: "center", marginTop: "10px"}}>
                Piano 61 Keys - Left / Right Hand
            </h1>


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
            {selectedSong && (
                <div className="song-info">
                    <h2 style={{textAlign: "center", marginTop: "10px"}}>
                        🎵 {isPlaying ? "Đang phát: " : "Đã dừng: "}
                        {selectedSong.title}
                    </h2>

                    <div className="note-sequence">
                        {selectedSong.notes.map((n, i) => (
                            <div
                                key={i}
                                className={`note-item ${i === currentIndex ? "active" : ""}`}
                                onClick={() => {
                                    setCurrentIndex(i);
                                    setSongStartTime(isPlaying ? Date.now() : null);
                                    // Tính lại offset dựa trên tổng thời gian của các nốt trước i
                                    let newOffset = 0;
                                    for (let j = 0; j < i; j++) {
                                        newOffset += (selectedSong.notes[j].duration || 600) / tempo;
                                    }
                                    setPauseTimeOffset(newOffset);
                                    if (isPlaying) {
                                        clearTimeout(timerRef.current);
                                    }
                                }}
                            >
                                {n.right || n.left}
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="piano" ref={containerRef} style={{marginTop: "10px", marginBottom: "350px"}}>
                <div className="falling-notes-container">
                    {(isPlaying || isCounting || (selectedSong && hasStarted)) && upcomingNotes.map((un) => (
                        <div
                            key={un.key}
                            className={`falling-note ${isBlack(un.note) ? "black" : ""} ${un.delay <= 0 ? "active-falling" : ""}`}
                            style={{
                                left: getNoteX(un.note),
                                height: un.height + "px",
                                top: "0px",
                                transform: un.delay <= 0 ? `translateY(-140px)` : "translateY(300px)",
                                animationName: un.delay <= 0 ? "none" : "slideUp",
                                animationDuration: (TRAVEL_TIME / 1000) + "s",
                                animationDelay: ((un.delay - TRAVEL_TIME + ADDITIONAL_DELAY) / 1000) + "s",
                                animationPlayState: (isPlaying || isCounting) ? "running" : "paused",
                                backgroundColor: getNoteColor(un),
                                opacity: un.delay <= 0 ? 1 : 1 - un.order * 0.1,
                            }}
                        >
                            {/* {un.order} */}
                        </div>
                    ))}
                    {isCounting && (
                        <div className="countdown-overlay">
                            {countdown}
                        </div>
                    )}
                </div>

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
