import { createContext , useState} from "react";

export const ShopContext = createContext();

const ShopContextProvider = (props) => {

    // Removed all state and helper functions as requested
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [userAvatar, setUserAvatar] = useState("");

    const value = {
        backendUrl,
        userAvatar,
        setUserAvatar
    };

    return (
        <ShopContext.Provider value={value}>
            {props.children}
        </ShopContext.Provider>
    );
};

export default ShopContextProvider;