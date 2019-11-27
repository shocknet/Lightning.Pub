const getListPage = ({ entries = [], itemsPerPage = 20, page = 1 }) => {
  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const offset = (page - 1) * itemsPerPage;
  const limit = page * itemsPerPage;
  const paginatedContent = entries.slice(offset, limit);
  return {
    content: paginatedContent,
    page,
    totalPages,
    totalItems: entries.length
  };
};

module.exports = getListPage;
