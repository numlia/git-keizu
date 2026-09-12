// CSS class names shared by the file history controller and the graph renderer.
// Kept free of DOM access so that modules loaded outside a browser (e.g. the graph
// engine under unit tests) can import them without side effects.

export const CLASS_FILE_HISTORY_MATCH = "fileHistoryMatch";
export const CLASS_FILE_HISTORY_CURRENT = "fileHistoryCurrent";
export const CLASS_FILE_HISTORY_DIM = "fileHistoryDim";
export const CLASS_FILE_HISTORY_MODE = "fileHistoryMode";
export const CLASS_FILE_HISTORY_NOTE = "fileHistoryNote";
