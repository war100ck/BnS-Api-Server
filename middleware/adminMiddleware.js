// middleware/adminMiddleware.js

export const isAdmin = (req, res, next) => {
  // Проверка наличия пользователя в сессии и флага admin
  if (req.session.user && req.session.user.admin === true) {
    return next(); // Если администратор, продолжаем выполнение
  }
  // Если нет, перенаправляем на страницу входа
  return res.redirect('/admin/login');
};
