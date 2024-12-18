import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import NotesApp from './components/NotesApp';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Logout from './components/auth/Logout';
import Profile from './components/auth/Profile';
import PrivateRoute from './components/auth/PrivateRoute';
import 'semantic-ui-css/semantic.min.css';

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Header />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <NotesApp />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/logout" element={<Logout />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
}

export default App;
