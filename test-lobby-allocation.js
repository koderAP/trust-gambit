/**
 * Test Script for Stage 2 Lobby Allocation Algorithm
 * Tests the optimal distribution logic for 10-20 players per lobby
 */

function calculateOptimalLobbies(totalQualifiedPlayers) {
  let stage2LobbiesCount;
  let playersPerLobby;
  
  if (totalQualifiedPlayers <= 20) {
    // Single lobby
    stage2LobbiesCount = 1;
    playersPerLobby = [totalQualifiedPlayers];
  } else {
    // Try different lobby counts and pick the one with minimum variance
    const minLobbies = Math.ceil(totalQualifiedPlayers / 20);
    const maxLobbies = Math.floor(totalQualifiedPlayers / 10);
    
    let bestCount = minLobbies;
    let minVariance = Infinity;
    
    for (let numLobbies = minLobbies; numLobbies <= maxLobbies; numLobbies++) {
      const baseSize = Math.floor(totalQualifiedPlayers / numLobbies);
      const remainder = totalQualifiedPlayers % numLobbies;
      
      // Some lobbies will have baseSize+1, others baseSize
      const largerLobbies = remainder;
      const smallerLobbies = numLobbies - remainder;
      
      // Calculate variance
      const avgSize = totalQualifiedPlayers / numLobbies;
      const variance = (largerLobbies * Math.pow(baseSize + 1 - avgSize, 2) + 
                       smallerLobbies * Math.pow(baseSize - avgSize, 2)) / numLobbies;
      
      if (variance < minVariance) {
        minVariance = variance;
        bestCount = numLobbies;
      }
    }
    
    stage2LobbiesCount = bestCount;
    
    // Calculate distribution
    const baseSize = Math.floor(totalQualifiedPlayers / stage2LobbiesCount);
    const remainder = totalQualifiedPlayers % stage2LobbiesCount;
    playersPerLobby = Array(stage2LobbiesCount).fill(baseSize);
    for (let i = 0; i < remainder; i++) {
      playersPerLobby[i]++;
    }
  }
  
  return { stage2LobbiesCount, playersPerLobby };
}

// Test cases
const testCases = [
  10, 15, 16, 20, 21, 25, 30, 35, 40, 45, 50, 55, 60, 80, 100, 120
];

console.log('Stage 2 Lobby Allocation Test Results');
console.log('=====================================\n');

testCases.forEach(total => {
  const result = calculateOptimalLobbies(total);
  const min = Math.min(...result.playersPerLobby);
  const max = Math.max(...result.playersPerLobby);
  const variance = max - min;
  
  console.log(`Total Players: ${total}`);
  console.log(`  Lobbies: ${result.stage2LobbiesCount}`);
  console.log(`  Distribution: [${result.playersPerLobby.join(', ')}]`);
  console.log(`  Range: ${min}-${max} (variance: ${variance})`);
  console.log(`  All within 10-20? ${min >= 10 && max <= 20 ? '✅ YES' : '❌ NO'}`);
  console.log('');
});
