import React from "react";

const Footer: React.FC = () => {
    return (
        <footer className="mt-8 py-4 text-center text-gray-600 text-sm">
            <p>
                Made by:{" "}
                <a
                    href="https://github.com/NoNum3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                >
                    陳英全 (Kenny Stevens)
                </a>
            </p>
            <p className="mt-1">
                明新科技大學
            </p>
        </footer>
    );
};

export default Footer;
