
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Styles for Quill

const API_URL = 'http://dev.wp-blog/wp-json/myapi/v1';

const Notification = ({ message, type }) => (
    <div className={`notification ${type}`}>{message}</div>
);

const NotesApp = () => {
    const [notes, setNotes] = useState([]);
    const [currentNote, setCurrentNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [page, setPage] = useState(1);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [totalPages, setTotalPages] = useState(1);

    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

    // Дебаунс, чтобы ограничить количество запросов
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(searchQuery), 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        if (debouncedQuery.trim() !== '') {
            searchNotes(debouncedQuery);
        } else {
            fetchNotes(page);
        }
    }, [debouncedQuery, page]);

    const searchNotes = async (query) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/news/search`, {
                params: { query },
            });
            setNotes(response.data.data || []);
        } catch {
            setError('Ошибка при выполнении поиска');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) navigate('/login');
    }, [navigate]);

    useEffect(() => {
        fetchNotes(page);
    }, [page]);

    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('authToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
        };
    }, []);

    const fetchNotes = async (pageNum = 1) => {
        const source = axios.CancelToken.source();
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.get(`${API_URL}/news`, {
                params: { page: pageNum, per_page: 5 },
                cancelToken: source.token,
            });
            setNotes(response.data.data); // Теперь получаем записи из data
            //console.log(response.data.data)
            setTotalPages(parseInt(response.data.total_pages, 10)); // Обновили total_pages
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log('Request canceled:', error.message);
            } else {
                setError('Ошибка при загрузке заметок');
            }
        } finally {
            setIsLoading(false);
        }

        return () => source.cancel('Request canceled due to component unmounting or page change.');
    };

    const fetchNoteById = async (id) => {
        setError(null);
        try {
            const response = await axios.get(`${API_URL}/news/${id}`);
            const note = response.data;
            setCurrentNote(note);
            setTitle(note.post_title || note.title?.rendered || '');
            setContent(note.post_content || note.content?.rendered || '');
            setIsEditing(true);
        } catch {
            setError('Ошибка при загрузке заметки');
        }
    };

    const createNote = async () => {
        setError(null);
        setSuccess(null);
        try {
            await axios.post(`${API_URL}/news`, { title, content });
            setSuccess('Заметка успешно создана!');
            fetchNotes(page);
            resetForm();
        } catch {
            setError('Ошибка при создании заметки');
        }
    };

    const updateNote = async (id) => {
        setError(null);
        setSuccess(null);
        try {
            await axios.put(`${API_URL}/news/${id}`, { title, content });
            setSuccess('Заметка успешно обновлена!');
            fetchNotes(page);
            resetForm();
        } catch {
            setError('Ошибка при обновлении заметки');
        }
    };

    const deleteNote = async (id) => {
        setError(null);
        setSuccess(null);
        try {
            await axios.delete(`${API_URL}/news/${id}`);
            setSuccess('Заметка успешно удалена!');
            fetchNotes(page);
        } catch {
            setError('Ошибка при удалении заметки');
        }
    };

    const confirmDelete = (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту заметку?')) {
            deleteNote(id);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setIsEditing(false);
        setCurrentNote(null);
    };
    // console.log(Array.isArray(notes));

    return (
        <div>
            <h1>News App</h1>

            {error && <Notification message={error} type="error" />}
            {success && <Notification message={success} type="success" />}

            <div>
                <h2>News Posts</h2>

                <div className="search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск заметок..."
                    />
                </div>

                {isLoading ? (
                    <div className="spinner"></div>
                ) : !Array.isArray(notes) ? (
                    <p>Ошибка: Заметки не являются массивом</p>
                ) : notes.length === 0 ? (
                    <p>Нет доступных заметок</p>
                ) : (
                    <ul className="notes-list">
                        {notes.map((note) => (
                            <li key={note.ID}>
                                <h3>{note.post_title}</h3>
                                <p
                                    dangerouslySetInnerHTML={{
                                        __html: note.post_excerpt || note.post_content.substring(0, 150),
                                    }}
                                />
                                <button onClick={() => fetchNoteById(note.ID)}>Редактировать</button>
                                <button onClick={() => confirmDelete(note.ID)}>Удалить</button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="pagination">
                    <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1}
                    >
                        Назад
                    </button>
                    <span>
                        Страница {page} из {totalPages > 0 ? totalPages : '...'}
                    </span>
                    <button
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page >= totalPages || totalPages === 0}
                    >
                        Вперед
                    </button>

                </div>
            </div>

            <div>
                <h2>{isEditing ? 'Редактирование заметки' : 'Создание заметки'}</h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (isEditing && currentNote) {
                            updateNote(currentNote.id);
                        } else {
                            createNote();
                        }
                    }}
                >
                    <div>
                        <label>Название</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Содержимое</label>
                        <ReactQuill
                            value={content}
                            onChange={setContent}
                            modules={{
                                toolbar: [
                                    [{ header: '1' }, { header: '2' }, { font: [] }],
                                    [{ list: 'ordered' }, { list: 'bullet' }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ color: [] }, { background: [] }],
                                    [{ align: [] }],
                                    ['link', 'image'],
                                    ['clean'],
                                ],
                            }}
                            formats={[
                                'header',
                                'font',
                                'list',
                                'bold',
                                'italic',
                                'underline',
                                'strike',
                                'color',
                                'background',
                                'align',
                                'link',
                                'image',
                            ]}
                            placeholder="Введите содержимое заметки..."
                        />
                    </div>
                    <button type="submit">
                        {isEditing ? 'Сохранить изменения' : 'Создать'}
                    </button>
                    {isEditing && <button type="button" onClick={resetForm}>Отменить</button>}
                </form>
            </div>
        </div>
    );
};

export default NotesApp;