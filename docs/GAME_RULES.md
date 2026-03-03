# Blind Alliance — Complete Game Rules

## 1. Overview

Blind Alliance is a trick-taking, points-based card game. One player wins the bidding
round and becomes the **Bidder**. The Bidder chooses a trump suit and secretly designates
teammates using card-reveal or hand-win conditions. Teammates are revealed gradually during
play. At the end, if the Bidder's team accumulated points ≥ their bid, they win.

---

## 2. Players and Decks

| Players | Decks | Total Points |
|---------|-------|--------------|
| 3–5     | 1     | 250          |
| 6–10    | 2     | 500          |

---

## 3. Card Point Values

Points are scored by winning tricks that contain valuable cards.

| Card                        | Points  |
|-----------------------------|---------|
| 3 of Spades                 | 30      |
| 5 of any suit (all four 5s) | 5 each  |
| 10 of any suit              | 10 each |
| Jack (J) of any suit        | 10 each |
| Queen (Q) of any suit       | 10 each |
| King (K) of any suit        | 10 each |
| Ace (A) of any suit         | 10 each |
| All other cards             | 0       |

**Total per deck = 250 points.**
- 3♠ = 30
- Four 5s = 20
- 10, J, Q, K, A across 4 suits = 200 (5 cards × 4 suits × 10 pts)

For 2 decks: all values double, total = 500 points.

---

## 4. Card Ranking (Priority)

Within any suit, cards rank from highest to lowest:

**A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2**

The 3 of Spades carries 30 points but has no special trick-winning power —
it is ranked as a normal 3 within the spades suit.

---

## 5. Setup and Dealing

1. Shuffle the deck(s).
2. Determine how many cards to deal: find the largest number divisible by the player count
   that is ≤ total cards in deck(s).
3. Remove the lowest-rank cards first (2s, then 3s of other suits, etc.) until the
   remaining count is evenly divisible by the number of players.
   > ⚠️ **The 3 of Spades must never be removed during balancing**, regardless of rank order.
   > Skip it and remove the next lowest eligible card instead.
4. Deal cards equally to all players.

---

## 6. Bidding

### 6.1 Bid Range
- **Minimum bid:** Half the total points (rounded down if needed).
  - 1 deck: minimum **125**
  - 2 decks: minimum **250**
- Players bid in turns (clockwise). Each new bid must be **strictly higher** than the current highest.
- Players who do not wish to bid may **pass**.
- The player with the **highest bid** becomes the **Bidder**.
- If all players pass without placing any bid, re-deal and restart bidding.

### 6.2 What Bidding Means
The Bidder is claiming their team will score **at least** as many points as their bid.

---

## 7. After Bidding: Bidder's Choices

Once the highest bid is established, the Bidder makes three declarations before play begins:

### 7.1 Choose Trump Suit
The Bidder declares one of the four suits (♠ ♥ ♦ ♣) as the **trump suit**.
Trump cards beat any non-trump card regardless of rank.

### 7.2 Choose Teammates
The Bidder forms a team. Team size rules:

| Total Players | Max Bidder Team Size | Teammates to Choose |
|---------------|----------------------|---------------------|
| 3             | 1 (Bidder alone)     | 0                   |
| 4             | 2                    | 1                   |
| 5             | 2                    | 1                   |
| 6             | 3                    | 2                   |
| 7             | 3                    | 2                   |
| 8             | 4                    | 3                   |
| 9             | 4                    | 3                   |
| 10            | 5                    | 4                   |

> **Rule:** The Bidder's team may not exceed half the total players (floor division).
> The Bidder counts as one of those slots.

### 7.3 Teammate Designation Methods

The Bidder announces one condition per teammate slot. Two methods are available:

#### Method A: Card Reveal Condition
The Bidder names a specific card. The player who **plays that card** during the game
becomes a teammate at the moment they play it.

- For **1-deck games:** name a card (e.g. "Ace of Hearts").
- For **2-deck games:** name a card AND specify the instance — **1st or 2nd**
  (e.g. "2nd King of Spades"). This distinguishes between the two identical cards
  across the two decks.

> ⚠️ **Only cards that were not removed during setup balancing may be named.**
> The UI must filter out removed cards from the selection options so the Bidder
> cannot choose a card that no longer exists in play.

#### Method B: First Trick Win
The Bidder declares: "Whoever wins the first trick is my teammate."
This can be used for one or more teammate slots.

### 7.4 Collapse Scenarios

Since teammates are revealed during play, overlaps can occur that shrink the Bidder's team:

| Scenario | Effect |
|----------|--------|
| One player satisfies two conditions | That player counts as one teammate; the second slot is lost |
| The Bidder satisfies their own condition (plays the named card, or wins trick 1 with a first-trick condition) | That slot collapses; no teammate gained |
| Named card was removed during setup balancing | Cannot happen — UI prevents naming removed cards |

The Bidder must accept all collapse outcomes.

---

## 8. Gameplay: Tricks

### 8.1 Starting a Trick
The Bidder plays the first card of the first trick.
The winner of each trick leads the next trick.
Play proceeds **clockwise**.

### 8.2 Playing a Card — Follow Suit Rules

1. **Must follow suit** — If the player holds any card of the led suit, they must play one.
2. **Trump** — If the player has no led-suit card, they may play a trump card.
3. **Fuse card** — If the player has no led-suit card, they may instead play any other card.
   A fuse card cannot win the trick.

> A **fuse card** is any card that is neither the led suit nor the trump suit,
> played when unable to follow suit.

### 8.3 Winning a Trick

Priority for determining the winner:

1. **Trump cards played:** The highest-ranked trump wins.
2. **No trump played:** The highest card of the led suit wins.
3. **Fuse cards** never win.

When multiple players play trump: the **highest-ranked trump** wins
(A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2).

#### Two-Deck Rule: Duplicate Card Tiebreak
In a 2-deck game, two players may play the **exact same card** (same suit and rank).
In this case: **the second card played takes priority over the first.**
The player who played the card later in clockwise order wins the trick
(assuming no higher trump or led-suit card is played after them).

### 8.4 Collecting Points
The trick winner collects all cards from the trick.
Only point cards (see Section 3) contribute to the score.

### 8.5 Teammate Reveal
When a player plays the card matching a Bidder's Card Reveal condition, their identity
as a teammate is **immediately revealed** to all players.
The "First Trick Win" condition resolves at the end of trick 1 when the winner is determined.

---

## 9. End of Game and Scoring

Play continues until all cards are exhausted.

### 9.1 Team Totals
- **Bidder's team:** Sum of point cards won by the Bidder and all confirmed teammates.
- **Opposing team:** Sum of point cards won by all other players.

### 9.2 Win Condition

| Outcome | Winner |
|---------|--------|
| Bidder's team total ≥ Bid | **Bidder's team wins** |
| Bidder's team total < Bid | **Opposing team wins** |

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Bidder** | The player who won the bidding round |
| **Trump suit** | The suit declared by the Bidder; beats all other suits |
| **Trick** | One round of play where each player contributes one card |
| **Fuse card** | An off-suit, non-trump card played when unable to follow suit; cannot win |
| **Collapse** | When a teammate slot is lost due to condition overlap or Bidder self-satisfaction |
| **Instance** | In 2-deck games, whether the 1st or 2nd copy of a card is named in a condition |
| **Duplicate tiebreak** | In 2-deck games, the second identical card played beats the first |