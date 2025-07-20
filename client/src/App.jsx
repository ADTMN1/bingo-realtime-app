import React, { useEffect, useState } from "react";
import socket from "./socket";

import {
  Container,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert,
} from "@mui/material";

const fixedBingoBoard = [
  [5, 18, 42, 60, 70],
  [10, 20, 35, 55, 65],
  [1, 16, "Free", 59, 71],
  [7, 23, 40, 54, 67],
  [12, 21, 44, 58, 73],
];

function App() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [lastNumber, setLastNumber] = useState(null);
  const [matchedNumbers, setMatchedNumbers] = useState([]);
  const [players, setPlayers] = useState({});
  const [winner, setWinner] = useState(null);

  const handleJoin = () => {
    if (name.trim()) {
      socket.emit("join", name.trim());
      setJoined(true);
    }
  };

  useEffect(() => {
    if (!joined) return;
    const flatBoard = fixedBingoBoard.flat().filter((n) => n !== "Free");
    const matched = drawnNumbers.filter((num) => flatBoard.includes(num));
    setMatchedNumbers(matched);
    socket.emit("matched-count", matched.length + 1);
  }, [drawnNumbers, joined]);

  useEffect(() => {
    socket.on("number-drawn", (number) => {
      setLastNumber(number);
      setDrawnNumbers((prev) => [...prev, number]);
    });

    socket.on("drawn-numbers", (numbers) => {
      setDrawnNumbers(numbers);
      if (numbers.length > 0) setLastNumber(numbers[numbers.length - 1]);
    });

    socket.on("players-update", (playersData) => {
      setPlayers(playersData);
    });

    socket.on("winner-update", (winnerName) => {
      setWinner(winnerName);
    });

    socket.on("game-restarted", () => {
      setDrawnNumbers([]);
      setLastNumber(null);
      setMatchedNumbers([]);
      setPlayers({});
      setWinner(null);
      setJoined(false);
      setName("");
    });

    return () => {
      socket.off("number-drawn");
      socket.off("drawn-numbers");
      socket.off("players-update");
      socket.off("winner-update");
      socket.off("game-restarted");
    };
  }, [joined]);

  const isNumberMatched = (num) => {
    if (num === "Free") return true;
    return matchedNumbers.includes(num);
  };

  const handleRestart = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const key = import.meta.env.VITE_ADMIN_KEY;
    fetch(`${apiUrl}/restart?key=${key}`).catch(console.error);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      {!joined ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Enter your name to join Bingo:
          </Typography>
          <TextField
            label="Your Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2, width: "100%" }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleJoin}
            disabled={!name.trim()}
            fullWidth
          >
            Join
          </Button>
        </Paper>
      ) : (
        <>
          <Typography variant="h4" gutterBottom textAlign="center">
            Realtime Bingo
          </Typography>

          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography variant="h6" component="span">
              Last Number Drawn:
            </Typography>{" "}
            <Typography
              variant="h3"
              component="span"
              sx={{ fontWeight: "bold", color: "primary.main" }}
            >
              {lastNumber || "-"}
            </Typography>
          </Box>

          <Paper>
            <Table sx={{ tableLayout: "fixed" }}>
              <TableBody>
                {fixedBingoBoard.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((num, j) => (
                      <TableCell
                        key={j}
                        align="center"
                        sx={{
                          bgcolor: isNumberMatched(num)
                            ? "success.main"
                            : "background.paper",
                          color: isNumberMatched(num)
                            ? "white"
                            : "text.primary",
                          fontWeight: num === "Free" ? "bold" : "normal",
                          fontSize: "1.2rem",
                          py: 2,
                          border: 1,
                          borderColor: "divider",
                        }}
                      >
                        {num}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Matched Numbers: {matchedNumbers.length + 1} (including Free)
          </Typography>

          {winner && (
            <Alert severity="success" sx={{ mt: 3, fontSize: "1.25rem" }}>
              🏆 Winner: {winner} 🎉
            </Alert>
          )}

          {winner === name && (
            <Alert severity="info" sx={{ mt: 1, fontWeight: "bold" }}>
              🎉 You Win!
            </Alert>
          )}

          <Button
            variant="outlined"
            color="secondary"
            onClick={handleRestart}
            sx={{ mt: 3 }}
            fullWidth
          >
            Restart Game
          </Button>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Players:
            </Typography>
            <Paper>
              <List dense>
                {Object.values(players).length === 0 && (
                  <ListItem>
                    <ListItemText primary="No players yet." />
                  </ListItem>
                )}
                {Object.values(players).map((player, idx) => (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={`${player.name} - Matched: ${player.matchedCount}`}
                      secondary={winner === player.name ? "🏆 Winner" : ""}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </>
      )}
    </Container>
  );
}

export default App;
