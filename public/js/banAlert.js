// public/js/banAlert.js
document.addEventListener('DOMContentLoaded', function() {
    const banDataElement = document.getElementById('ban-data');
    if (banDataElement) {
        const banReason = banDataElement.dataset.banReason;
        const banUntil = banDataElement.dataset.banUntil;

        Swal.fire({
            title: 'ACCESS DENIED',
            html: `<div style="text-align: center; padding: 15px;">
                <div style="margin-bottom: 20px; font-size: 18px; color: #fff;">
                    <i class="fas fa-ban" style="color: #ff3e3e; font-size: 24px;"></i>
                    <p style="margin-top: 10px;">Your game account has been temporarily suspended</p>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Reason:</span>
                        <span style="color: #fff; font-weight: bold;">${banReason}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #aaa;">Unban Date:</span>
                        <span style="color: #fff; font-weight: bold;">${banUntil}</span>
                    </div>
                </div>
                
                <div style="font-size: 15px; color: #ccc; line-height: 1.5;">
                    If you believe this is a mistake or wish to appeal the ban,<br>
                    please contact our support team via Discord.
                </div>
            </div>`,
            icon: 'error',
            width: 650,
            background: 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url("/images/backgrounds/banned.webp") center/cover',
            confirmButtonText: 'Contact via Discord',
            confirmButtonColor: '#7289da',
            showCloseButton: true,
            closeButtonAriaLabel: 'Close',
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
                container: 'ban-alert-container',
                popup: 'ban-alert-popup',
                title: 'ban-alert-title',
                htmlContainer: 'ban-alert-content',
                confirmButton: 'ban-alert-button',
                closeButton: 'ban-alert-close'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                window.open('https://discord.gg/your-server', '_blank');
            }
        });
    }
});
