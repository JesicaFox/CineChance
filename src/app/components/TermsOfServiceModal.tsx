'use client';

import { useEffect, useRef, useState } from 'react';

type TermsOfServiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Обработка закрытия по Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Закрытие при клике вне модального окна
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={`relative w-full max-w-2xl max-h-[80vh] m-4 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden transition-transform duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* Заголовок */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">Пользовательское соглашение</h2>
          <button 
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Содержимое */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6 space-y-6 text-gray-300">
          
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">1. Общие положения</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>1.1. Настоящее Пользовательское соглашение (далее — «Соглашение») определяет условия использования сайта и его сервисов.</p>
              <p>1.2. Владельцем сайта и оператором персональных данных является лицо, администрирующее сайт (далее — «Оператор»).</p>
              <p>1.3. Пользователь — физическое лицо, прошедшее регистрацию на сайте либо использующее сайт без регистрации.</p>
              <p>1.4. Использование сайта означает полное и безоговорочное согласие Пользователя с условиями настоящего Соглашения.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">2. Регистрация и учётная запись</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>2.1. Для доступа к функционалу сайта Пользователь может пройти процедуру регистрации.</p>
              <p>2.2. При регистрации Пользователь обязуется предоставить достоверную информацию.</p>
              <p>2.3. Пользователь несёт ответственность за сохранность данных своей учётной записи и за все действия, совершённые под ней.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">3. Использование сервиса</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>3.1. Сайт предоставляет Пользователю доступ к функционалу сервиса «как есть», без гарантий бесперебойной работы.</p>
              <p>3.2. Оператор вправе изменять, дополнять или прекращать работу сервиса полностью или частично без предварительного уведомления.</p>
              <p>3.3. Пользователь обязуется не использовать сайт в целях, противоречащих законодательству Российской Федерации.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">4. Персональные данные</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>4.1. Обработка персональных данных Пользователя осуществляется в соответствии с Политикой обработки персональных данных и Федеральным законом Российской Федерации № 152-ФЗ «О персональных данных».</p>
              <p>4.2. Регистрируясь на сайте, Пользователь даёт согласие на обработку своих персональных данных в целях функционирования сервиса.</p>
              <p>4.3. Пользователь вправе в любой момент отозвать согласие путём удаления учётной записи или обращения к Оператору.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">5. Cookies</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>5.1. Сайт использует файлы cookies и аналогичные технологии для обеспечения корректной работы сервиса.</p>
              <p>5.2. Продолжая использование сайта, Пользователь соглашается с использованием cookies.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">6. Ограничение ответственности</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>6.1. Оператор не несёт ответственности за:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>перебои в работе сайта;</li>
                <li>утрату данных по причинам, не зависящим от Оператора;</li>
                <li>действия третьих лиц.</li>
              </ul>
              <p>6.2. Пользователь использует сайт на свой риск.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">7. Изменение условий</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>7.1. Оператор вправе изменять настоящее Соглашение в одностороннем порядке.</p>
              <p>7.2. Новая редакция вступает в силу с момента публикации на сайте.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-3">8. Заключительные положения</h3>
            <div className="space-y-2 text-sm leading-relaxed">
              <p>8.1. Настоящее Соглашение действует с момента начала использования сайта.</p>
              <p>8.2. Все споры подлежат разрешению в соответствии с законодательством Российской Федерации.</p>
            </div>
          </section>

        </div>

        {/* Футер с кнопкой закрытия */}
        <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 p-4">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:brightness-110 transition"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}
