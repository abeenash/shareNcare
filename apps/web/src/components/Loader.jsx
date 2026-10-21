import { useState, CSSProperties } from "react";
import { ClipLoader } from "react-spinners"

const override = {
    display: "block",
    margin: "0 auto",
    bordercolor: "red",
};

const Loader = () => {
    return (
        <div>
            <ClipLoader
                color="#83a2d9"
                loading={true}
                cssOverride={override}
                size={50}
                aria-label="Loading Spinner"
                data-testid="loader"
            />
        </div>
    )

}

export default Loader;