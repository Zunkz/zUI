// Copied from Pleroma FE
// https://git.pleroma.social/pleroma/pleroma-fe/-/blob/develop/src/services/tiny_post_html_processor/tiny_post_html_processor.service.js

type Processor = (html: string) => string;

/**
 * This is a tiny purpose-built HTML parser/processor. This basically detects any type of visual newline and
 * allows it to be processed, useful for greentexting, mostly.
 *
 * known issue: doesn't handle CDATA so nested CDATA might not work well.
 */
export const processHtml = (html: string, processor: Processor): string => {
  const handledTags = new Set(['p', 'br', 'div']);
  const openCloseTags = new Set(['p', 'div']);

  let buffer = ''; // Current output buffer
  const level: string[] = []; // How deep we are in tags and which tags were there
  let textBuffer = ''; // Current line content
  let tagBuffer = null; // Current tag buffer, if null = we are not currently reading a tag

  // Extracts tag name from tag, i.e. <span a="b"> => span
  const getTagName = (tag: string): string | null => {
    const result = /(?:<\/(\w+)>|<(\w+)\s?[^/]*?\/?>)/gi.exec(tag);
    return result && (result[1] || result[2]);
  };

  const flush = (): void => { // Processes current line buffer, adds it to output buffer and clears line buffer
    if (textBuffer.trim().length > 0) {
      buffer += processor(textBuffer);
    } else {
      buffer += textBuffer;
    }
    textBuffer = '';
  };

  const handleBr = (tag: string): void => { // handles single newlines/linebreaks/selfclosing
    flush();
    buffer += tag;
  };

  const handleOpen = (tag: string): void => { // handles opening tags
    flush();
    buffer += tag;
    level.push(tag);
  };

  const handleClose = (tag: string): void => { // handles closing tags
    flush();
    buffer += tag;
    if (level[level.length - 1] === tag) {
      level.pop();
    }
  };

  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    if (char === '<' && tagBuffer === null) {
      tagBuffer = char;
    } else if (char !== '>' && tagBuffer !== null) {
      tagBuffer += char;
    } else if (char === '>' && tagBuffer !== null) {
      tagBuffer += char;
      const tagFull = tagBuffer;
      tagBuffer = null;
      const tagName = getTagName(tagFull);
      if (tagName && handledTags.has(tagName)) {
        if (tagName === 'br') {
          handleBr(tagFull);
        } else if (openCloseTags.has(tagName)) {
          if (tagFull[1] === '/') {
            handleClose(tagFull);
          } else if (tagFull[tagFull.length - 2] === '/') {
            // self-closing
            handleBr(tagFull);
          } else {
            handleOpen(tagFull);
          }
        }
      } else {
        textBuffer += tagFull;
      }
    } else if (char === '\n') {
      handleBr(char);
    } else {
      textBuffer += char;
    }
  }
  if (tagBuffer) {
    textBuffer += tagBuffer;
  }

  flush();

  return buffer;
};
