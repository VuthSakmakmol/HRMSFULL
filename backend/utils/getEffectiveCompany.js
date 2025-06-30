exports.getEffectiveCompany = (req) => {
  const role = req.user?.role;
  let company = req.user?.company;

  if (role === 'GeneralManager' && req.headers['x-override-company']) {
    company = req.headers['x-override-company'];
  }

  return company;
};
