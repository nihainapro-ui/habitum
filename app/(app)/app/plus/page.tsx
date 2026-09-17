import { PlusView } from '@/components/plus/PlusView';

/* « Plus » — la quatrième destination de la barre basse (refonte mobile,
   PDF p. 3). Une route à part entière, prérendue comme les douze autres :
   l'APK y entre par `/app/plus/index.html` comme partout. */
export default function Page() {
  return <PlusView />;
}
