import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

import "../styles/Register.css";

import emailIcon from "../assets/icons/icon_email.png";
import accountIcon from "../assets/icons/icon_account.png";
import passwordIcon from "../assets/icons/icon_password.png";
import viewPasswordIcon from "../assets/icons/icon_viewpassword.png";

function Register() {

    const navigate = useNavigate();

    const [showPassword,setShowPassword]=useState(false);
    const [showConfirmPassword,setShowConfirmPassword]=useState(false);

    const [errorMsg,setErrorMsg]=useState("");

    const [form,setForm]=useState({
        username:"",
        email:"",
        password:"",
        confirm_password:"",
        first_name:"",
        last_name:"",
        phone_number:"",
        location:""
    });

    const handleChange=(e)=>{
        setForm({
            ...form,
            [e.target.name]:e.target.value
        });
    };

    const validate = () => {

        if (!form.first_name.trim() || !form.last_name.trim()) {
            return "Ime i prezime su obavezni.";
        }

        if (!form.username.trim()) {
            return "Korisničko ime je obavezno.";
        }

        if (form.username.length < 3) {
            return "Korisničko ime mora imati najmanje 3 karaktera.";
        }

        if (!form.email.trim()) {
            return "Email je obavezan.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            return "Unesite ispravnu email adresu.";
        }

        if (form.phone_number && !/^[0-9+\s-]{6,20}$/.test(form.phone_number)) {
            return "Unesite ispravan broj telefona.";
        }

        if (!form.password) {
            return "Lozinka je obavezna.";
        }

        if (form.password.length < 8) {
            return "Lozinka mora imati najmanje 8 karaktera.";
        }

        if (form.password !== form.confirm_password) {
            return "Lozinka i potvrda lozinke se ne poklapaju.";
        }

        return "";
    };

    const register = async (e) => {

        e.preventDefault();
        setErrorMsg("");

        const validationError = validate();
        if (validationError) {
            setErrorMsg(validationError);
            return;
        }

        try {

            const response = await api.post("/register/", form);

            if (response.data.success) {

                localStorage.setItem("access_token", response.data.access);
                localStorage.setItem("refresh_token", response.data.refresh);

                navigate("/interests");

            }

        } catch (error) {

            setErrorMsg(
                error.response?.data?.message ||
                "Greška kod registracije"
            );

        }

    }

    return(

        <div className="register-page">
            <div className="register-card">
                <h1>REGISTRUJTE SE</h1>
                {
                errorMsg &&
                <p className="error">{errorMsg}</p>
                }
                <form onSubmit={register}>
                    <div className="input-row">
                        <input
                            className="input-plain"
                            name="first_name"
                            placeholder="Ime"
                            value={form.first_name}
                            onChange={handleChange}
                        />
                        <input
                            className="input-plain"
                            name="last_name"
                            placeholder="Prezime"
                            value={form.last_name}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-box">
                        <img src={accountIcon} alt="" />
                        <input
                            name="username"
                            placeholder="Korisničko ime"
                            value={form.username}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-box">
                        <img src={emailIcon} alt="" />
                        <input
                            type="email"
                            name="email"
                            placeholder="ime.prezime@example.com"
                            value={form.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-box">
                        <img src={passwordIcon} alt="" />
                        <input
                            type={showPassword?"text":"password"}
                            name="password"
                            placeholder="Lozinka"
                            value={form.password}
                            onChange={handleChange}
                            />
                        <button
                            type="button"
                            className="eye-btn"
                            onClick={()=>setShowPassword(!showPassword)}
                            >
                        <img src={viewPasswordIcon} alt="" />
                        </button>
                    </div>
                    <div className="input-box">
                        <img src={passwordIcon} alt="" />
                        <input
                            type={showConfirmPassword?"text":"password"}
                            name="confirm_password"
                            placeholder="Ponovi lozinku"
                            value={form.confirm_password}
                            onChange={handleChange}
                            />
                        <button
                            type="button"
                            className="eye-btn"
                            onClick={()=>setShowConfirmPassword(!showConfirmPassword)}
                            >
                        <img src={viewPasswordIcon} alt="" />
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="register-btn"
                        >
                        Registracija
                    </button>
                </form>
                <p className="login-text">
                    Imate kreiran profil?
                <Link to="/login">
                    Prijavite se
                </Link>
                </p>
            </div>
        </div>
    )
}

export default Register;