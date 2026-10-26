`speech.mp3` is synthetic test audio, not a recording or conversation. It contains 30 seconds of a 440 Hz sine wave for real MediaSource playback tests.

Generate with: `ffmpeg -f lavfi -i "sine=frequency=440:duration=30:sample_rate=16000" -c:a libmp3lame -b:a 32k -write_xing 0 -y tests/fixtures/speech.mp3`.
