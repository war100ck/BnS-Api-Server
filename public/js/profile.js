document.addEventListener('DOMContentLoaded', async () => {
    const avatarEditIcon = document.getElementById('avatarEditIcon');

    // Если элемента нет (пользователь не найден или страница ошибки), не продолжаем
    if (!avatarEditIcon) {
        return;
    }

    // Функция для открытия выбора аватара
    const openAvatarSelection = async () => {
        try {
            const response = await fetch('/avatars');
            const data = await response.json();

            if (!data.success) throw new Error('Failed to load avatars');

            const avatarsHTML = data.avatars.map(avatar => `
                <div class="avatar-option-container">
                    <img src="/images/avatars/${avatar}" alt="${avatar}" 
                        class="avatar-option" 
                        data-avatar="${avatar}">
                </div>
            `).join('');

            await Swal.fire({
                title: '<span style="color: var(--primary-accent)">Select Avatar</span>',
                html: `<div class="avatar-grid">${avatarsHTML}</div>`,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                customClass: {
                    popup: 'custom-swal-popup',
                    htmlContainer: 'swal-html-container'
                },
                width: '90%',
                didOpen: () => {
                    document.querySelectorAll('.avatar-option').forEach(option => {
                        option.addEventListener('click', function() {
                            Swal.close();
                            updateAvatar(this.getAttribute('data-avatar'));
                        });
                    });
                }
            });

        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Failed to load avatars', 'error');
        }
    };

    // Обработчик события для иконки редактирования
    avatarEditIcon.addEventListener('click', openAvatarSelection);

    async function updateAvatar(avatar) {
        const userName = new URLSearchParams(window.location.search).get('userName');
        if (!userName || !avatar) {
            Swal.fire('Error', 'Missing userName or avatar!', 'error');
            return;
        }

        try {
            const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userName,
                    avatar
                })
            });

            if (response.ok) {
                document.querySelector('.user-avatar').src = `/images/avatars/${avatar}`;
                Swal.fire({
                    title: 'Success',
                    text: 'Avatar updated successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)'
                });
            } else throw new Error('Failed to update avatar');
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'An error occurred while updating avatar.', 'error');
        }
    }
});