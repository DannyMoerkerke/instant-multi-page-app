export const compile = data => {
  return `
    ${data.map(posting => posting.title)}
  `;
};
