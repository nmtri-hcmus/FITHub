export class AhoCorasick {
  private gotoFn: { [key: number]: { [key: string]: number } } = { 0: {} };
  private output: { [key: number]: string[] } = {};
  private failure: { [key: number]: number } = {};
  private stateCount = 0;

  constructor(keywords: string[]) {
    this.buildMatchingMachine(keywords);
  }

  private buildMatchingMachine(keywords: string[]) {
    // Phase 1: Build the trie (goto function)
    for (const word of keywords) {
      let currentState = 0;
      for (const char of word.toLowerCase()) {
        if (this.gotoFn[currentState] && this.gotoFn[currentState][char] !== undefined) {
          currentState = this.gotoFn[currentState][char];
        } else {
          this.stateCount++;
          if (!this.gotoFn[currentState]) this.gotoFn[currentState] = {};
          this.gotoFn[currentState][char] = this.stateCount;
          this.gotoFn[this.stateCount] = {};
          currentState = this.stateCount;
        }
      }
      if (!this.output[currentState]) this.output[currentState] = [];
      this.output[currentState].push(word.toLowerCase());
    }

    // Phase 2: Build the failure function (BFS)
    const queue: number[] = [];
    for (const char in this.gotoFn[0]) {
      const state = this.gotoFn[0][char];
      this.failure[state] = 0;
      queue.push(state);
    }

    while (queue.length > 0) {
      const state = queue.shift()!;
      for (const char in this.gotoFn[state]) {
        const nextState = this.gotoFn[state][char];
        queue.push(nextState);

        let failState = this.failure[state];
        while (failState !== undefined && (!this.gotoFn[failState] || this.gotoFn[failState][char] === undefined)) {
          failState = this.failure[failState];
        }
        
        if (failState === undefined) {
          this.failure[nextState] = 0;
        } else {
          this.failure[nextState] = this.gotoFn[failState][char];
          
          if (this.output[this.failure[nextState]]) {
            if (!this.output[nextState]) this.output[nextState] = [];
            this.output[nextState].push(...this.output[this.failure[nextState]]);
          }
        }
      }
    }
  }

  public censor(text: string): string {
    let currentState = 0;
    let result = text;
    const lowerText = text.toLowerCase();

    for (let i = 0; i < lowerText.length; i++) {
      const char = lowerText[i];
      
      while (currentState !== undefined && (!this.gotoFn[currentState] || this.gotoFn[currentState][char] === undefined)) {
        currentState = this.failure[currentState];
      }
      
      if (currentState === undefined) {
        currentState = 0;
      } else {
        currentState = this.gotoFn[currentState][char];
        
        if (this.output[currentState] && this.output[currentState].length > 0) {
          for (const match of this.output[currentState]) {
            const startIdx = i - match.length + 1;
            const stars = '*'.repeat(match.length);
            result = result.substring(0, startIdx) + stars + result.substring(i + 1);
          }
        }
      }
    }
    
    return result;
  }
}

// Banned words list
const BANNED_WORDS = ['spam', 'scam', 'abuse', 'fuck', 'shit', 'bitch', 'asshole'];
export const wordFilter = new AhoCorasick(BANNED_WORDS);
