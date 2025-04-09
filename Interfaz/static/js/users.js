const users = [
    { username: "Valente", password: "v4l3nt3" },
    { username: "Victor", password: "v1ct0r" },
    { username: "Candy", password: "c4ndy" },
];

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Evita que el formulario se envíe

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');

    // Verificar si el usuario y la contraseña coinciden
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem('loggedInUser', user.username);
        window.location.href = "/sistema"; // Redirigir a la página de bienvenida
    } else {
        errorMessage.textContent = "Usuario o contraseña incorrectos.";
    }
});