type UserAvatarProps = {
  name: string;
  image?: string | null;
};

const UserAvatar = ({ name, image }: UserAvatarProps) => {
  if (image) {
    return (
      <div className="avatar">
        <div className="w-9 rounded-full ring-1 ring-base-content/15">
          <img src={image} alt={name} referrerPolicy="no-referrer" />
        </div>
      </div>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="avatar avatar-placeholder">
      <div className="w-9 rounded-full bg-base-300 ring-1 ring-base-content/15">
        <span className="font-serif italic text-lg" role="img" aria-label={name}>
          {initial}
        </span>
      </div>
    </div>
  );
};

export default UserAvatar;
