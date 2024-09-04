interface GetPrompt {
  language: string;
}
export const getPrompt = ({ language = 'English' }: GetPrompt) => {
  return `
    Language: Please write in ${language} language! Please write in ${language} language!Please write in ${language} language!
    
    Instructions:Please answer within 200-800 characters. Your task is to summarize the website content using the provided subtitles. Your output should use the following template:
    #### Summary
    {Summarize the website content in one sentence, ensuring it's no more than 30 words.}
    #### Highlights
    {Provide 5 highlights, starting with a summarizing phrase. }
  `;
};
