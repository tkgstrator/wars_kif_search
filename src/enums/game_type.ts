/**
 * データをパースする用のEnum
 */
export namespace GameType {
  /**
   * 持ち時間
   */
  export enum Time {
    MIN_10 = '10 min',
    MIN_3 = '3 min',
    SEC_10 = '10 sec'
  }

  export enum Type {}

  export enum Rule {
    NORMAL = 'normal',
    SPRINT = 'sprint'
  }

  /**
   * 対局モード
   */
  export enum Mode {
    // 段級位戦
    NORMAL = 'rank',
    // 友達対局
    FRIENDS = 'friends',
    // 指導対局
    COACH = 'coach',
    // 大会
    EVENT = 'event',
    // 棋神ラーニング
    LEARNING = 'learning'
  }

  export enum Status {
    WIN = 'win',
    LOSE = 'lose',
    DRAW = 'draw',
    PLAYING = 'playing'
  }

  export enum Result {
    BLACK_WIN = 'black_win',
    WHITE_WIN = 'white_win',
    DRAW = 'draw',
    PLAYING = 'playing'
  }
}
