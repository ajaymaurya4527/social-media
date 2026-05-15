import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux' // If using Redux, otherwise use localStorage/Cookies
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'

export default function AuthLayout({ children, authentication = true }) {
    const navigate = useNavigate()
    const [loader, setLoader] = useState(true)
    
    // Logic: Check if token exists in localStorage or Cookies
    const token = localStorage.getItem("accessToken") 

    useEffect(() => {
        if (authentication && !token) {
            // User needs to be logged in but isn't
            navigate("/login")
        } else if (!authentication && token) {
            // User is logged in but trying to access Login/Register page
            navigate("/")
        }
        setLoader(false)
    }, [token, navigate, authentication])

    return loader ? <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div> : <>{children}</>
}